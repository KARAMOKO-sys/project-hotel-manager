import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { BaseCrudService } from './base-crud.service';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

interface TestEntity {
  _id: string;
  name: string;
  is_deleted?: boolean;
}

class TestCrudService extends BaseCrudService<TestEntity, any, any> {
  constructor(model: Model<TestEntity>) {
    super(model, 'TestEntity');
  }
}

describe('BaseCrudService', () => {
  let service: TestCrudService;
  let model: any;

  const entity = { _id: '507f1f77bcf86cd799439011', name: 'Alpha' };

  beforeEach(() => {
    const save = jest.fn().mockImplementation(function () {
      return Promise.resolve(this);
    });

    const ModelMock: any = function (data: any) {
      Object.assign(this, data);
      this.save = save;
    };
    ModelMock.findById = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(entity) });
    ModelMock.findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ ...entity, name: 'Updated' }),
    });
    ModelMock.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([entity]),
    });
    ModelMock.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });
    ModelMock.exists = jest.fn().mockResolvedValue(entity);

    model = ModelMock;
    service = new TestCrudService(model as unknown as Model<TestEntity>);
  });

  it('should create an entity', async () => {
    const result = await service.create({ name: 'Alpha' });
    expect(result).toEqual(expect.objectContaining({ name: 'Alpha' }));
  });

  it('should find one by id', async () => {
    await expect(service.findOne(entity._id)).resolves.toEqual(entity);
  });

  it('should throw NotFoundException when missing', async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    await expect(service.findOne('507f1f77bcf86cd799439999')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should return a paginated result', async () => {
    const query = new PaginationQueryDto();
    const result = await service.findAll(query);
    expect(result.meta.total).toBe(1);
    expect(result.data).toHaveLength(1);
  });

  it('should update an entity', async () => {
    const result = await service.update(entity._id, { name: 'Updated' });
    expect(model.findByIdAndUpdate).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ name: 'Updated' }));
  });

  it('should soft-remove an entity', async () => {
    model.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ ...entity, is_deleted: true }),
    });
    const result = await service.remove(entity._id);
    expect(model.findByIdAndUpdate).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ is_deleted: true }));
  });
});
