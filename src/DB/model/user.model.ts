import { HydratedDocument, model, models, Schema } from "mongoose";
import { GenderEnum, ProviderEnum, RoleEnum } from "../../common/enums";
import { IUser } from "../../common/interfaces";
import { string } from "zod";
import { generateEncryption, generateHash } from "../../common/utils/security";

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    slug: { type: String, required: true },

    email: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: function (this) {
        return this.provider == ProviderEnum.SYSTEM;
      },
    },

    phone: { type: String },
    profilePicture: { type: String },
    profileCoverPictures: { type: [String] },

    gender: { type: Number, enum: GenderEnum, default: GenderEnum.MALE },
    role: { type: Number, enum: RoleEnum, default: RoleEnum.USER },
    provider: {
      type: Number,
      enum: ProviderEnum,
      default: ProviderEnum.SYSTEM,
    },

    changeCredentialsTime: { type: Date },
    DOB: { type: Date },
    confirmEmail: { type: Date },

    deletedAt: { type: Date },
    restoredAt: { type: Date },

    extra: {
      name: string,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    strict: true,
    strictQuery: true,
    collection: "SOCIAL_APP_USERS",
  },
);

userSchema
  .virtual("username")
  .set(function (value: string) {
    const [firstName, lastName] = value.split(" ") || [];
    this.firstName = firstName as string;
    this.lastName = lastName as string;
    this.slug = value.replaceAll(/\s+/g, "-");
  })
  .get(function () {
    return `${this.firstName} ${this.lastName}`;
  });

// ===== MIDDLEWARE =====

// PRE SAVE
userSchema.pre(
  "save",
  async function (this: HydratedDocument<IUser> & { wasNew: boolean }) {
    this.wasNew = this.isNew;

    if (this.isModified("password")) {
      this.password = await generateHash({ plaintext: this.password });
    }

    if (this.phone && this.isModified("phone")) {
      this.phone = await generateEncryption(this.phone);
    }
  },
);

// PRE UPDATE (updateOne, findOneAndUpdate)
userSchema.pre(["updateOne", "findOneAndUpdate"], function () {
  let update = this.getUpdate() as any;

  // normalize update (handle $set)
  if (!update.$set) {
    update.$set = {};
  }

  // ===== SOFT DELETE =====
  if (update.deletedAt) {
    update.$set.deletedAt = update.deletedAt;
    delete update.deletedAt;

    update.$unset = { ...(update.$unset || {}), restoredAt: 1 };
  }

  // ===== RESTORE =====
  if (update.restoredAt) {
    update.$set.restoredAt = update.restoredAt;
    delete update.restoredAt;

    update.$unset = { ...(update.$unset || {}), deletedAt: 1 };

    // ensure restoring only soft deleted docs
    this.setQuery({
      ...this.getQuery(),
      deletedAt: { $exists: true },
    });
  }

  this.setUpdate(update);

  // ===== PARANOID FILTER =====
  const query = this.getQuery() as any;

  if (query.paranoid === false) {
    delete query.paranoid;
    this.setQuery(query);
  } else {
    this.setQuery({
      deletedAt: { $exists: false },
      ...query,
    });
  }
});

// PRE DELETE (deleteOne, findOneAndDelete)
userSchema.pre(["deleteOne", "findOneAndDelete"], function () {
  const query = this.getQuery() as any;

  // ===== FORCE DELETE =====
  if (query.force === true) {
    delete query.force;
    this.setQuery(query);
    return;
  }

  // ===== DEFAULT: ONLY DELETE SOFT-DELETED DOCS =====
  this.setQuery({
    deletedAt: { $exists: true },
    ...query,
  });
});

// OPTIONAL: DELETE DEPENDENT DOCUMENTS (example)
userSchema.pre("findOneAndDelete", async function () {
  const user = await this.model.findOne(this.getQuery());

  if (!user) return;

  // ex: delete posts from selected user
  // await PostModel.deleteMany({ userId: user._id });
});

// ======================

export const UserModel = models.User || model<IUser>("User", userSchema);
