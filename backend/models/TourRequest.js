const mongoose = require('mongoose');

const tourRequestSchema = new mongoose.Schema({
  reqId: String,
  purpose: String,
  startDate: String,
  endDate: String,
  destinationFrom: String,
  destinationTo: String,
  distanceKm: String,
  totalTravelAmount: Number,
  travellingBy: String,
  food: {
    breakfast: { type: Boolean, default: false },
    lunch: { type: Boolean, default: false },
    dinner: { type: Boolean, default: false }
  },
  foodAmounts: {
    breakfast: { type: String, default: "" },
    lunch: { type: String, default: "" },
    dinner: { type: String, default: "" }
  },
  hotelExpense: String,
  otherExpenses: [{
    name: String,
    amount: String
  }],
  estimatedFare: { type: Number, default: 0 },
  advanceRequested: { type: Number, default: 0 },
  advanceMode: { type: String, default: "" },
  hotelName: { type: String, default: "" },
  hotelNights: { type: Number, default: 0 },
  hotelRate: { type: Number, default: 0 },
  hotelBookingRef: { type: String, default: "" },
  bookingRef: { type: String, default: "" },
  travelClass: { type: String, default: "" },
  department: { type: String, default: "" },
  mealDays: { type: Number, default: 0 },
  mealRate: { type: Number, default: 0 },
  specialRemarks: { type: String, default: "" },
  details: String,
  requestedBy: String,
  requestedByName: String,
  status: { type: String, default: "Pending Review" },
  timestamp: String,
  preTravelDocuments: [{ type: String }],
  reimbursementBills: [{ type: String }],
  
  // Reimbursement fields
  reimDate: { type: String, default: "" },
  actualDeparture: { type: String, default: "" },
  actualReturn: { type: String, default: "" },
  actualTravelMode: { type: String, default: "" },
  actualDistance: { type: String, default: "" },
  actualExpenses: {
    fare: { type: Number, default: 0 },
    hotel: { type: Number, default: 0 },
    meals: { type: Number, default: 0 },
    local: { type: Number, default: 0 },
    comm: { type: Number, default: 0 },
    misc: { type: Number, default: 0 }
  },
  actualBillNos: {
    fare: { type: String, default: "" },
    hotel: { type: String, default: "" },
    meals: { type: String, default: "" },
    local: { type: String, default: "" },
    comm: { type: String, default: "" },
    misc: { type: String, default: "" }
  },
  actualReceipts: {
    fare: { type: String, default: "Pending" },
    hotel: { type: String, default: "Pending" },
    meals: { type: String, default: "Pending" },
    local: { type: String, default: "Pending" },
    comm: { type: String, default: "Pending" },
    misc: { type: String, default: "Pending" }
  },
  actualAdvanceReceived: { type: Number, default: 0 },
  actualAdvanceRef: { type: String, default: "" },
  tripOutcome: { type: String, default: "" },
  outcomeNextSteps: { type: String, default: "" },
  employeeRemarks: { type: String, default: "" },
  reimbursementStatus: { type: String, default: "" }
});

tourRequestSchema.index({ requestedBy: 1 });
tourRequestSchema.index({ status: 1 });

module.exports = mongoose.model('TourRequest', tourRequestSchema);
