import { Injectable } from '@nestjs/common';
import { CreateOtaConnectionDto } from '../dto/create-ota-connection.dto';
import { UpdateOtaConnectionDto } from '../dto/update-ota-connection.dto';

@Injectable()
export class OtaConnectionService {
  create(createOtaConnectionDto: CreateOtaConnectionDto) {
    return 'This action adds a new otaConnection';
  }

  findAll() {
    return `This action returns all otaConnection`;
  }

  findOne(id: number) {
    return `This action returns a #${id} otaConnection`;
  }

  update(id: number, updateOtaConnectionDto: UpdateOtaConnectionDto) {
    return `This action updates a #${id} otaConnection`;
  }

  remove(id: number) {
    return `This action removes a #${id} otaConnection`;
  }
}
