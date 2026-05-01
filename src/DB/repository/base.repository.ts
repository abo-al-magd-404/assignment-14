import {
  AnyKeys,
  CreateOptions,
  DeleteResult,
  FlattenMaps,
  HydratedDocument,
  Model,
  PopulateOptions,
  ProjectionType,
  QueryFilter,
  QueryOptions,
  ReturnsNewDoc,
  Types,
  UpdateQuery,
  UpdateResult,
  UpdateWithAggregationPipeline,
} from "mongoose";
import { IUser } from "../../common/interfaces";
import { UpdateOptions } from "mongodb";

export abstract class DatabaseRepository<TRawDoc> {
  constructor(protected readonly model: Model<TRawDoc>) {}

  //   CREATE
  async create({
    data,
  }: {
    data: Partial<TRawDoc>;
  }): Promise<HydratedDocument<TRawDoc>>;

  async create({
    data,
    options,
  }: {
    data: Partial<TRawDoc>[];
    options?: CreateOptions | undefined;
  }): Promise<HydratedDocument<TRawDoc>[]>;

  async create({
    data,
    options,
  }: {
    data: Partial<TRawDoc> | Partial<TRawDoc>[];
    options?: CreateOptions | undefined;
  }): Promise<HydratedDocument<TRawDoc> | HydratedDocument<TRawDoc>[]> {
    return await this.model.create(data as any, options);
  }

  async createOne({
    data,
    options,
  }: {
    data: Partial<TRawDoc>;
    options?: CreateOptions | undefined;
  }): Promise<HydratedDocument<TRawDoc>> {
    const [doc] = await this.create({
      data: [data],
      options,
    });

    return doc as HydratedDocument<TRawDoc>;
  }

  //   INSERT MANY
  async insertMany({
    data,
  }: {
    data: AnyKeys<TRawDoc>[];
  }): Promise<HydratedDocument<TRawDoc>[]> {
    return (await this.model.insertMany(
      data as any,
    )) as HydratedDocument<TRawDoc>[];
  }

  //   FIND
  async find({
    filter,
    projection,
    options,
  }: {
    filter?: QueryFilter<TRawDoc>;
    projection?: ProjectionType<TRawDoc> | null | undefined;
    options?: QueryOptions<TRawDoc> | null | undefined;
  }): Promise<HydratedDocument<TRawDoc>[]> {
    const doc = this.model.find(filter, projection);

    if (options?.populate) doc.populate(options.populate as PopulateOptions[]);
    if (options?.lean) doc.lean(options.lean);

    return await doc.exec();
  }

  async findOne({
    filter,
    projection,
    options,
  }: {
    filter?: QueryFilter<TRawDoc>;
    projection?: ProjectionType<TRawDoc> | null | undefined;
    options?: (QueryOptions<TRawDoc> & { lean: false }) | null | undefined;
  }): Promise<HydratedDocument<IUser> | null>;

  async findOne({
    filter,
    projection,
    options,
  }: {
    filter?: QueryFilter<TRawDoc>;
    projection?: ProjectionType<TRawDoc> | null | undefined;
    options?: (QueryOptions<TRawDoc> & { lean: true }) | null | undefined;
  }): Promise<null | FlattenMaps<IUser>>;

  async findOne({
    filter,
    projection,
    options,
  }: {
    filter?: QueryFilter<TRawDoc>;
    projection?: ProjectionType<TRawDoc> | null | undefined;
    options?: QueryOptions<TRawDoc> | null | undefined;
  }): Promise<any> {
    const doc = this.model.findOne(filter, projection);

    if (options?.populate) doc.populate(options.populate as PopulateOptions[]);
    if (options?.lean) doc.lean(options.lean);

    return await doc.exec();
  }

  async findById({
    _id,
    projection,
    options,
  }: {
    _id?: Types.ObjectId;
    projection?: ProjectionType<TRawDoc> | null | undefined;
    options?: (QueryOptions<TRawDoc> & { lean: false }) | null | undefined;
  }): Promise<HydratedDocument<IUser> | null>;

  async findById({
    _id,
    projection,
    options,
  }: {
    _id?: Types.ObjectId;
    projection?: ProjectionType<TRawDoc> | null | undefined;
    options?: (QueryOptions<TRawDoc> & { lean: true }) | null | undefined;
  }): Promise<null | FlattenMaps<IUser>>;

  async findById({
    _id,
    projection,
    options,
  }: {
    _id?: Types.ObjectId;
    projection?: ProjectionType<TRawDoc> | null | undefined;
    options?: QueryOptions<TRawDoc> | null | undefined;
  }): Promise<any> {
    const doc = this.model.findById(_id, projection);

    if (options?.populate) doc.populate(options.populate as PopulateOptions[]);
    if (options?.lean) doc.lean(options.lean);

    return await doc.exec();
  }

  // UPDATE
  async findOneAndUpdate({
    filter,
    update,
    options = { new: true },
  }: {
    filter: QueryFilter<TRawDoc>;
    update: UpdateQuery<TRawDoc>;
    options?: QueryOptions<TRawDoc> & ReturnsNewDoc;
  }): Promise<HydratedDocument<TRawDoc> | null> {
    return await this.model.findOneAndUpdate(
      filter,
      { ...update, $inc: { __v: 1 } },
      options,
    );
  }

  async updateOne({
    filter,
    update,
    options,
  }: {
    filter: QueryFilter<TRawDoc>;
    update: UpdateQuery<TRawDoc> | UpdateWithAggregationPipeline;
    options?: UpdateOptions | null;
  }): Promise<UpdateResult> {
    return await this.model.updateOne(
      filter,
      { ...update, $inc: { __v: 1 } },
      options,
    );
  }

  async findByIdAndUpdate({
    _id,
    update,
    options = { new: true },
  }: {
    _id: Types.ObjectId;
    update: UpdateQuery<TRawDoc>;
    options: QueryOptions<TRawDoc> & ReturnsNewDoc;
  }): Promise<HydratedDocument<TRawDoc> | null> {
    return await this.model.findByIdAndUpdate(
      _id,
      { ...update, $inc: { __v: 1 } },
      options,
    );
  }

  async updateMany({
    filter,
    update,
    options,
  }: {
    filter: QueryFilter<TRawDoc>;
    update: UpdateQuery<TRawDoc> | UpdateWithAggregationPipeline;
    options?: UpdateOptions | null;
  }): Promise<UpdateResult> {
    return await this.model.updateMany(filter, update, options);
  }

  // DELETE
  async findOneAndDelete({
    filter,
  }: {
    filter: QueryFilter<TRawDoc>;
  }): Promise<HydratedDocument<TRawDoc> | null> {
    return await this.model.findOneAndDelete(filter);
  }

  async findByIdAndDelete({
    _id,
  }: {
    _id: Types.ObjectId;
  }): Promise<HydratedDocument<TRawDoc> | null> {
    return await this.model.findByIdAndDelete(_id);
  }

  async deleteOne({
    filter,
  }: {
    filter: QueryFilter<TRawDoc>;
  }): Promise<DeleteResult> {
    return await this.model.deleteOne(filter);
  }

  async deleteMany({
    filter,
  }: {
    filter: QueryFilter<TRawDoc>;
  }): Promise<DeleteResult> {
    return await this.model.deleteMany(filter);
  }
}
