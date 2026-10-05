import { Injectable } from '@nestjs/common';
import { CreatePosItemDto } from '../dto/create-pos-item.dto';
import { UpdatePosItemDto } from '../dto/update-pos-item.dto';

@Injectable()
export class PosItemService {
  create(createPosItemDto: CreatePosItemDto) {
    return 'This action adds a new posItem';
  }

  findAll() {
    return `This action returns all posItem`;
  }

  findOne(id: number) {
    return `This action returns a #${id} posItem`;
  }

  update(id: number, updatePosItemDto: UpdatePosItemDto) {
    return `This action updates a #${id} posItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} posItem`;
  }
}
