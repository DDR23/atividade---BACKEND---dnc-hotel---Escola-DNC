import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateReservationDto } from '../domain/dto/create-reservation.dto';
import { differenceInDays } from 'date-fns';
import { IReservationRepositories } from '../domain/repositories/IReservation.repositories';
import { IHotelRepositories } from 'src/modules/hotels/domain/repositories/IHotel.repositories';
import { MailerService } from '@nestjs-modules/mailer';
import { createOwnerEmail, createUserEmail } from '../utils/templateHTML';
import { IUserRepositories } from 'src/modules/users/domain/repositories/IUser.repositories';

@Injectable()
export class CreateReservationService {
  constructor(
    @Inject('RESERVATION_SERVICE_TOKEN')
    private readonly reservationRepositories: IReservationRepositories,
    @Inject('REPOSITORY_TOKEN_HOTEL')
    private readonly hotelRepositories: IHotelRepositories,
    @Inject('USER_SERVICE_TOKEN')
    private readonly userRepositories: IUserRepositories,
    private readonly mailerService: MailerService,
  ) { }

  async execute(id: number, data: CreateReservationDto) {
    const { RESERVATION_CHECKIN, RESERVATION_CHECKOUT, FK_RESERVATION_HOTEL_ID } = data;
    if (RESERVATION_CHECKIN >= RESERVATION_CHECKOUT) throw new BadRequestException('Check-out date must ba after check-in date');
    const daysOfStay = differenceInDays(RESERVATION_CHECKIN, RESERVATION_CHECKOUT);
    const hotel = await this.hotelRepositories.findHotelById(FK_RESERVATION_HOTEL_ID);
    if (!hotel) throw new NotFoundException('Hotel not found');
    if (typeof hotel.HOTEL_PRICE !== 'number' || hotel.HOTEL_PRICE <= 0) throw new BadRequestException('Invalid hotel price');
    const total = daysOfStay * hotel.HOTEL_PRICE;
    const newReservation = {
      ...data,
      RESERVATION_CHECKIN,
      RESERVATION_CHECKOUT,
      RESERVATION_TOTAL: total, // TODO - total nao pode ficar negativo
      FK_RESERVATION_USER_ID: id,
    };
    const hotelOwner = await this.userRepositories.findUserById(hotel.FK_HOTEL_OWNER_ID);
    await this.mailerService.sendMail({
      to: hotelOwner.USER_EMAIL,
      subject: 'Pending Reservation Approval',
      html: createOwnerEmail(hotelOwner.USER_NAME),
    })
    const user = await this.userRepositories.findUserById(id);
    await this.mailerService.sendMail({
      to: user.USER_EMAIL,
      subject: 'Pending Reservation Approval',
      html: createUserEmail(user.USER_NAME),
    })
    return await this.reservationRepositories.createReservation(newReservation)
  }
}