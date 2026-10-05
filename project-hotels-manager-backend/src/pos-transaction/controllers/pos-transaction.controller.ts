import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PosTransactionService } from '../services/pos-transaction.service';
import { CreatePosTransactionDto } from '../dto/create-pos-transaction.dto';
import { UpdatePosTransactionDto } from '../dto/update-pos-transaction.dto';

@Controller('pos-transaction')
export class PosTransactionController {
  constructor(private readonly posTransactionService: PosTransactionService) {}

  @Post()
  create(@Body() createPosTransactionDto: CreatePosTransactionDto) {
    return this.posTransactionService.create(createPosTransactionDto);
  }

  @Get()
  findAll() {
    return this.posTransactionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.posTransactionService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePosTransactionDto: UpdatePosTransactionDto,
  ) {
    return this.posTransactionService.update(+id, updatePosTransactionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.posTransactionService.remove(+id);
  }
}
