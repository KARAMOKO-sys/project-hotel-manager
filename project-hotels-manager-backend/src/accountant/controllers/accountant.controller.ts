import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AccountantService } from '../services/accountant.service';
import { CreateAccountantDto } from '../dto/create-accountant.dto';
import { UpdateAccountantDto } from '../dto/update-accountant.dto';

@Controller('accountant')
export class AccountantController {
  constructor(private readonly accountantService: AccountantService) {}

  @Post()
  create(@Body() createAccountantDto: CreateAccountantDto) {
    return this.accountantService.create(createAccountantDto);
  }

  @Get()
  findAll() {
    return this.accountantService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountantService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAccountantDto: UpdateAccountantDto,
  ) {
    return this.accountantService.update(+id, updateAccountantDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountantService.remove(+id);
  }
}
