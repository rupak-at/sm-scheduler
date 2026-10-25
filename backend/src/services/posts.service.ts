import { findPostInputs } from '../repositories/post-input.repository.js';
import type { PrismaClient } from '../database/index.js';
import type { PostInput } from '@social-scheduler/shared';
import type { MediaStorage } from '../lib/media/media-storage.types.js';
import { WorkspaceError } from '../lib/workspace-error.js';
import { postInclude, postView } from '../repositories/post-view.js';
import { channelCanSchedule, eligibleChannelWhere } from '../lib/channel-eligibility.js';
import type { TikTokServices } from '../integrations/tiktok/services.js';
import { prepareTikTokPost } from './tiktok-posts.service.js';
import { Prisma } from '../database/index.js';
import { advancePostRevision } from '../repositories/post-revision.js';

export class PostsService {
  constructor(
    private readonly db: PrismaClient,
    private readonly storage: MediaStorage,
    private readonly configured = true,
    private readonly facebookConfigured = false,
    private readonly tiktok?: TikTokServices,
  ) {}
  async save(userId: string, input: PostInput, id?: string, revision?: string) {
    this.validateSchedule(input);
    const metadata = await prepareTikTokPost(this.db, this.tiktok, userId, input);
    return this.db.$transaction(
      async (tx) => {
        const { account, media } = await findPostInputs(tx, userId, input);
        if (!account || !media)
          throw new WorkspaceError(
            404,
            'Choose an account and uploaded media from your workspace.',
          );
        if (input.scheduledAt && !this.providerConfigured(account.provider))
          throw new WorkspaceError(422, 'Configure this provider before scheduling.');
        if (input.scheduledAt && !channelCanSchedule(account))
          throw new WorkspaceError(422, 'Reconnect this account before scheduling.');
        this.validateMediaDelivery(input, media);
        const updatedAt = new Date();
        if (id) {
          await tx.$queryRaw`SELECT id FROM "Publication" WHERE "postId" = ${id}::uuid FOR UPDATE`;
          const previous = await tx.post.findFirst({
            where: { id, userId },
            include: { publications: true },
          });
          if (!previous) throw new WorkspaceError(404, 'Post not found.');
          if (!revision || previous.updatedAt.toISOString() !== revision)
            throw new WorkspaceError(409, 'This post changed. Reload before saving.');
          updatedAt.setTime(Math.max(Date.now(), previous.updatedAt.getTime() + 1));
          if (
            previous.publications.some(
              (item) =>
                !['DRAFT', 'SCHEDULED', 'CANCELLED', 'FAILED'].includes(item.status) ||
                item.publishRequestedAt !== null,
            )
          )
            throw new WorkspaceError(409, 'This post can no longer be edited.');
        }
        const publication = {
          socialAccountId: account.id,
          status: input.scheduledAt ? ('SCHEDULED' as const) : ('DRAFT' as const),
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          timezone: input.timezone,
          externalContainerId: null,
          publishRequestedAt: null,
          providerMetadata: metadata ?? Prisma.DbNull,
        };
        const post = id
          ? await tx.post.update({
              where: { id },
              data: {
                caption: input.caption,
                updatedAt,
                media: { deleteMany: {}, create: { mediaAssetId: media.id, position: 0 } },
                publications: { updateMany: { where: { postId: id }, data: publication } },
              },
              include: postInclude,
            })
          : await tx.post.create({
              data: {
                userId,
                caption: input.caption,
                media: { create: { mediaAssetId: media.id, position: 0 } },
                publications: { create: publication },
              },
              include: postInclude,
            });
        return postView(post);
      },
      // Publication locks serialize edits/claims; input row locks protect ownership
      // and eligibility. Predicate locking creates false conflicts across creators.
      { isolationLevel: 'ReadCommitted' },
    );
  }
  private validateSchedule(input: PostInput) {
    if (input.scheduledAt && new Date(input.scheduledAt).getTime() < Date.now() + 60000)
      throw new WorkspaceError(422, 'Schedule at least one minute in the future.');
  }
  private providerConfigured(provider: string) {
    return provider === 'INSTAGRAM'
      ? this.configured
      : provider === 'FACEBOOK'
        ? this.facebookConfigured
        : provider === 'TIKTOK' && Boolean(this.tiktok);
  }
  private validateMediaDelivery(
    input: PostInput,
    media: { id: string; mimeType: string; storageKey: string },
  ) {
    if (!input.scheduledAt) return;
    try {
      this.storage.publicMediaUrl(
        media.id,
        media.mimeType === 'video/mp4' ? 'mp4' : 'jpg',
        media.storageKey,
      );
    } catch {
      throw new WorkspaceError(422, 'Configure media delivery before scheduling.');
    }
  }
  async remove(userId: string, id: string) {
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Publication" WHERE "postId" = ${id}::uuid FOR UPDATE`;
      const post = await tx.post.findFirst({
        where: { id, userId },
        include: { publications: { include: { attempts: true } } },
      });
      if (!post) throw new WorkspaceError(404, 'Post not found.');
      if (
        post.publications.some(
          (item) => !['DRAFT', 'CANCELLED'].includes(item.status) || item.attempts.length,
        )
      )
        throw new WorkspaceError(
          409,
          'Only unpublished drafts without publishing attempts can be deleted.',
        );
      await tx.publication.deleteMany({ where: { postId: id } });
      await tx.post.delete({ where: { id } });
    });
  }
  async cancel(userId: string, id: string) {
    await this.db.$transaction(async (tx) => {
      const result = await tx.publication.updateMany({
        where: { postId: id, post: { userId }, status: { in: ['DRAFT', 'SCHEDULED'] } },
        data: { status: 'CANCELLED', scheduledAt: null },
      });
      if (result.count !== 1)
        throw new WorkspaceError(409, 'Only drafts and scheduled posts can be cancelled.');
      await advancePostRevision(tx, id, userId);
    });
  }
  async retry(userId: string, id: string) {
    if (
      await this.db.publication.findFirst({
        where: { postId: id, post: { userId }, socialAccount: { provider: 'TIKTOK' } },
      })
    )
      throw new WorkspaceError(
        422,
        'Edit this TikTok post and review its current settings before rescheduling.',
      );
    const providers: ('INSTAGRAM' | 'FACEBOOK')[] = [];
    if (this.configured) providers.push('INSTAGRAM');
    if (this.facebookConfigured) providers.push('FACEBOOK');
    await this.db.$transaction(async (tx) => {
      const result = await tx.publication.updateMany({
        where: {
          postId: id,
          post: { userId },
          status: 'FAILED',
          publishRequestedAt: null,
          socialAccount: { userId, ...eligibleChannelWhere(providers) },
        },
        data: {
          status: 'SCHEDULED',
          scheduledAt: new Date(Date.now() + 60000),
          externalContainerId: null,
        },
      });
      if (result.count !== 1)
        throw new WorkspaceError(
          409,
          'Configure or reconnect this account, or resolve the publishing outcome before retrying.',
        );
      await advancePostRevision(tx, id, userId);
    });
  }
}
