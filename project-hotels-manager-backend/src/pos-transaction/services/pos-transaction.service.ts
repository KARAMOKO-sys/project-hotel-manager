import { Injectable } from '@nestjs/common';
import { CreatePosTransactionDto } from '../dto/create-pos-transaction.dto';
import { UpdatePosTransactionDto } from '../dto/update-pos-transaction.dto';

@Injectable()
export class PosTransactionService {
  create(createPosTransactionDto: CreatePosTransactionDto) {
    return 'This action adds a new posTransaction';
  }

  findAll() {
    return `This action returns all posTransaction`;
  }

  findOne(id: number) {
    return `This action returns a #${id} posTransaction`;
  }

  update(id: number, updatePosTransactionDto: UpdatePosTransactionDto) {
    return `This action updates a #${id} posTransaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} posTransaction`;
  }
}
