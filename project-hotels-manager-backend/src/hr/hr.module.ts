import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Staff, StaffSchema } from '../staff/schemas/staff.entity';
import { Department, DepartmentSchema } from './schemas/department.entity';
import {
  EmploymentContract,
  EmploymentContractSchema,
} from './schemas/employment-contract.entity';
import { HrSettings, HrSettingsSchema } from './schemas/hr-settings.entity';
import { LeaveType, LeaveTypeSchema } from './schemas/leave-type.entity';
import {
  LeaveAllocation,
  LeaveAllocationSchema,
} from './schemas/leave-allocation.entity';
import {
  LeaveRequest,
  LeaveRequestSchema,
} from './schemas/leave-request.entity';
import {
  ShiftAssignment,
  ShiftAssignmentSchema,
} from './schemas/shift-assignment.entity';
import { Attendance, AttendanceSchema } from './schemas/attendance.entity';
import { HrStaffService } from './services/hr-staff.service';
import { HrSettingsService } from './services/hr-settings.service';
import { DepartmentService } from './services/department.service';
import { ContractService } from './services/contract.service';
import { LeaveTypeService } from './services/leave-type.service';
import { LeaveAllocationService } from './services/leave-allocation.service';
import { LeaveRequestService } from './services/leave-request.service';
import { ShiftService } from './services/shift.service';
import { AttendanceService } from './services/attendance.service';
import { HrSettingsController } from './controllers/hr-settings.controller';
import { DepartmentController } from './controllers/department.controller';
import { ContractController } from './controllers/contract.controller';
import { LeaveTypeController } from './controllers/leave-type.controller';
import { LeaveAllocationController } from './controllers/leave-allocation.controller';
import { LeaveController } from './controllers/leave.controller';
import { ShiftController } from './controllers/shift.controller';
import { AttendanceController } from './controllers/attendance.controller';

/**
 * Application RH (`hr`) : départements, contrats, congés, planning et
 * pointage, construits sur les affectations existantes (`staff`).
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Staff.name, schema: StaffSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: EmploymentContract.name, schema: EmploymentContractSchema },
      { name: HrSettings.name, schema: HrSettingsSchema },
      { name: LeaveType.name, schema: LeaveTypeSchema },
      { name: LeaveAllocation.name, schema: LeaveAllocationSchema },
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
      { name: ShiftAssignment.name, schema: ShiftAssignmentSchema },
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
  ],
  controllers: [
    HrSettingsController,
    DepartmentController,
    ContractController,
    LeaveTypeController,
    LeaveAllocationController,
    LeaveController,
    ShiftController,
    AttendanceController,
  ],
  providers: [
    HrStaffService,
    HrSettingsService,
    DepartmentService,
    ContractService,
    LeaveTypeService,
    LeaveAllocationService,
    LeaveRequestService,
    ShiftService,
    AttendanceService,
  ],
  exports: [
    HrStaffService,
    ContractService,
    LeaveRequestService,
    ShiftService,
    AttendanceService,
  ],
})
export class HrModule {}
