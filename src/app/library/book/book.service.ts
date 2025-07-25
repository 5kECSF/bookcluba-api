import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { Book, BookDocument } from './entities/book.entity';

import { logTrace } from '@/common/logger';
import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import { UpdateResponse } from '../../../providers/database/base/mongo.entity';
import { UserService } from '../../account/users';

@Injectable()
export class BookService extends MongoGenericRepository<Book> {
  constructor(
    @InjectModel(Book.name) private bookModel: Model<BookDocument>,
    private usersService: UserService,
  ) {
    super(bookModel);
  }

  public async CountCtg(categoryId: string) {
    // const bookCnt = await this.co
  }

  public async Like(bookId: string, userId) {
    try {
      // TODO if user already liked the book unlike it
      // const session = await this.connection.startSession();
      // const session = await mongoose.startSession();
      // session.startTransaction();

      //this is to keep track of the liked and unliked state
      let dislikeCont = 0;
      let likeCnt = 0;
      // 1. if the user have already disliked this book remove that
      const dislike = await this.usersService.updateOneAndReturnCount(
        { _id: userId, dislikedBooks: bookId },
        { $pull: { dislikedBooks: bookId } },
      );
      if (dislike.body.matchedCount >= 1 && dislike.body.modifiedCount >= 1) dislikeCont++;

      // 2. if the user have not previously liked this book like it
      const like = await this.usersService.updateOneAndReturnCount(
        { _id: userId, likedBooks: { $ne: bookId } },
        { $addToSet: { likedBooks: bookId } },
      );
      if (!like.ok) return false;
      if (like.body.matchedCount >= 1 && like.body.modifiedCount >= 1) likeCnt++;

      if (likeCnt > 0 || dislikeCont > 0) {
        const result: UpdateResponse = await this.bookModel.updateOne(
          { _id: bookId },
          { $inc: { likesCount: likeCnt, dislikesCount: -dislikeCont } },
        );
        return result.modifiedCount > 0;
      }

      // .session(session);
      // });
      // session.endSession();
      return false;
    } catch (e) {
      logTrace('likeError', e.message);
      return false;
    }
  }

  public async Dislike(bookId: string, userId) {
    try {
      // const session = await this.connection.startSession();
      // await session.withTransaction(async () => {

      let remvdLikeCnt = 0;
      let dislikedCnt = 0;
      //1. if book is already liked remove it
      const removeLike = await this.usersService.updateOneAndReturnCount(
        { _id: userId, likedBooks: bookId },
        { $pull: { likedBooks: bookId } },
      );
      if (removeLike.body.matchedCount >= 1 && removeLike.body.modifiedCount >= 1) remvdLikeCnt++;

      // 2. if the user have not previously disliked this book dislike it
      const addToDislike = await this.usersService.updateOneAndReturnCount(
        { _id: userId, dislikedBooks: { $ne: bookId } },
        { $addToSet: { dislikedBooks: bookId } },
      );
      if (!addToDislike.ok) return false;
      if (addToDislike.body.matchedCount >= 1 && addToDislike.body.modifiedCount >= 1)
        dislikedCnt++;

      if (dislikedCnt > 0 || remvdLikeCnt > 0) {
        const result: UpdateResponse = await this.bookModel.updateOne(
          { _id: bookId },
          { $inc: { likesCount: -remvdLikeCnt, dislikesCount: dislikedCnt } },
        );
        return result.modifiedCount > 0;
      }

      // });
      // session.endSession();
      return false;
    } catch (e) {
      logTrace('DislikeError', e.message);
      return false;
    }
  }
}
