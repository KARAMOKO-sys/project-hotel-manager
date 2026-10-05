import { Injectable } from '@nestjs/common';
import { CreateBlockedDateDto } from '../dto/create-blocked-date.dto';
import { UpdateBlockedDateDto } from '../dto/update-blocked-date.dto';

@Injectable()
export class BlockedDateService {
  create(createBlockedDateDto: CreateBlockedDateDto) {
    return 'This action adds a new blockedDate';
  }

  findAll() {
    return `This action returns all blockedDate`;
  }

  findOne(id: number) {
    return `This action returns a #${id} blockedDate`;
  }

  update(id: number, updateBlockedDateDto: UpdateBlockedDateDto) {
    return `This action updates a #${id} blockedDate`;
  }

  remove(id: number) {
    return `This action removes a #${id} blockedDate`;
  }
}
