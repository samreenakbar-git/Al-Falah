import mongoose from "mongoose"

const zakatApplicantSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    streetAddress: String,
    city: String,
    state: String,
    zipCode: String,
    gender: { type: String, enum: ["male", "female"] },
    dateOfBirth: Date,
    mobilePhone: { type: String, required: true },
    homePhone: String,
    email: { type: String, unique: true, sparse: true },
    legalStatus: String,
    referredBy: String,
    referrerPhone: String,
    employmentStatus: String,
    dependentsInfo: String,
    totalMonthlyIncome: Number,
    incomeSources: String,
    rentMortgage: Number,
    utilities: Number,
    food: Number,
    otherExpenses: String,
    totalDebts: Number,
    requestType: { type: String, default: "Zakat" },
    amountRequested: Number,
    whyApplying: String,
    circumstances: String,
    previousZakat: String,
    zakatResourceSource: String,
    reference1: {
      fullName: String,
      phoneNumber: String,
      email: String,
      relationship: String,
    },
    reference2: {
      fullName: String,
      phoneNumber: String,
      email: String,
      relationship: String,
    },
    documents: [
      {
        filename: String,
        originalname: String,
        mimeType: String,
        size: Number,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Approved", "Rejected", "Ready for Approval", "Need Info", "In Review"],
    },
    caseId: { type: String },
    isOldCase: { type: Boolean, default: false }, // Flag to indicate this is an old/historical case (no emails sent)
  },
  { timestamps: true },
)

// Compound index for caseId uniqueness per tenant
zakatApplicantSchema.index({ tenantId: 1, caseId: 1 }, { unique: true })

export default mongoose.models.ZakatApplicant || mongoose.model("ZakatApplicant", zakatApplicantSchema)
