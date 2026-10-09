import type { PrismaClient } from '@social-scheduler/database';
import type { PostInput } from '@social-scheduler/shared';
import type { MediaStorage } from '@social-scheduler/publishing';
import { WorkspaceError } from './errors.js';
import { postInclude, postView } from './post-view.js';

export class PostsService {
  constructor(
    private readonly db: PrismaClient,
    private readonly storage: MediaStorage,
    private readonly configured = true,
  ) {}
  async save(userId: string, input: PostInput, id?: string, revision?: string) {
    this.validateSchedule(input);
    return this.db.$transaction(
      async (tx) => {
        const account = await tx.socialAccount.findFirst({
          where: { id: input.socialAccountId, userId, provider: 'INSTAGRAM' },
        });
        const media = await tx.mediaAsset.findFirst({
          where: { id: input.mediaAssetId, userId, status: 'READY', type: 'IMAGE' },
        });
        if (!account || !media)
          throw new WorkspaceError(
            404,
            'Choose an account and uploaded photo from your workspace.',
          );
        if (
          input.scheduledAt &&
          (account.status !== 'CONNECTED' ||
            !account.tokenExpiresAt ||
            account.tokenExpiresAt.getTime() <= Date.now())
        )
          throw new WorkspaceError(422, 'Reconnect Instagram before scheduling.');
        if (id) {
          await tx.$queryRaw`SELECT id FROM "Publication" WHERE "postId" = ${id}::uuid FOR UPDATE`;
          const previous = await tx.post.findFirst({
            where: { id, userId },
            include: { publications: true },
          });
          if (!previous) throw new WorkspaceError(404, 'Post not found.');
          if (!revision || previous.updatedAt.toISOString() !== revision)
            throw new WorkspaceError(409, 'This post changed. Reload before saving.');
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
        };
        const post = id
          ? await tx.post.update({
              where: { id },
              data: {
                caption: input.caption,
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
      { isolationLevel: 'Serializable' },
    );
  }
  private validateSchedule(input: PostInput) {
    if (input.scheduledAt && new Date(input.scheduledAt).getTime() < Date.now() + 60000)
      throw new WorkspaceError(422, 'Schedule at least one minute in the future.');
    if (input.scheduledAt && !this.configured)
      throw new WorkspaceError(422, 'Configure Instagram before scheduling.');
    if (input.scheduledAt) {
      try {
        this.storage.publicMediaUrl(input.mediaAssetId);
      } catch {
        throw new WorkspaceError(422, 'Configure a public HTTPS media URL before scheduling.');
      }
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
    const result = await this.db.publication.updateMany({
      where: { postId: id, post: { userId }, status: { in: ['DRAFT', 'SCHEDULED'] } },
      data: { status: 'CANCELLED', scheduledAt: null },
    });
    if (result.count !== 1)
      throw new WorkspaceError(409, 'Only drafts and scheduled posts can be cancelled.');
  }
  async retry(userId: string, id: string) {
    if (!this.configured) throw new WorkspaceError(422, 'Configure Instagram before retrying.');
    const result = await this.db.publication.updateMany({
      where: {
        postId: id,
        post: { userId },
        status: 'FAILED',
        publishRequestedAt: null,
        socialAccount: { status: 'CONNECTED', tokenExpiresAt: { gt: new Date() } },
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
        'Reconnect Instagram or resolve the publishing outcome before retrying.',
      );
  }
}
