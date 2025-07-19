const mongoose = require("mongoose");

export const LoginSessionSchema = new mongoose.Schema({
    EId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity', required: true }, // Entity Id
    UserId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },        // User Id
    In: { type: Date },                                             // Login DateTime
    Out: { type: Date },                                            // Logout DateTime
    AccessToken: { type: String, trim: true },                      // Access Token
});

const LoginSession = mongoose.model("LoginSession", LoginSessionSchema, "LoginSession");
export { LoginSession };
