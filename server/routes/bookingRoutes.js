import express from "express";
import { createBooking, createOrder, getOccupiedSeats, verifyPayment } from "../controllers/bookingController.js";

const bookingRouter = express.Router();

bookingRouter.post('/create', createBooking);
bookingRouter.get('/seats/:showId', getOccupiedSeats);
bookingRouter.post("/verify", verifyPayment);
bookingRouter.post("/create-order", createOrder);



export default bookingRouter;