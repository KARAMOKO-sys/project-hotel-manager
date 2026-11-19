import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { ActivityActor, ActivityService } from '../services/activity.service';
import {
  MarkActivityDoneDto,
  MyActivitiesQueryDto,
  PostMessageDto,
  ScheduleActivityDto,
} from '../dto/activity.dto';
import { RecordParamsDto } from '../../records/dto/record-params.dto';

/** Fil de discussion et activités planifiées des fiches. */
@ApiTags('Activity')
@RequiresApp('activity')
@Controller('activity')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get('my-activities')
  myActivities(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: MyActivitiesQueryDto,
  ) {
    return this.activity.myActivities(user?.sub, query.property_id);
  }

  @Post('activities/:id/done')
  markDone(
    @Param() params: IdParamDto,
    @Body() dto: MarkActivityDoneDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.activity.markDone(params.id, dto, this.actor(user));
  }

  @Post('activities/:id/cancel')
  cancel(
    @Param() params: IdParamDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.activity.cancelActivity(params.id, this.actor(user));
  }

  @Get(':model/:id/thread')
  thread(@Param() params: RecordParamsDto) {
    return this.activity.getThread(params.model, params.id);
  }

  @Post(':model/:id/messages')
  postMessage(
    @Param() params: RecordParamsDto,
    @Body() dto: PostMessageDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.activity.postMessage(
      params.model,
      params.id,
      dto,
      this.actor(user),
    );
  }

  @Post(':model/:id/follow')
  follow(
    @Param() params: RecordParamsDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.activity.follow(params.model, params.id, this.actor(user));
  }

  @Post(':model/:id/unfollow')
  unfollow(
    @Param() params: RecordParamsDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.activity.unfollow(params.model, params.id, this.actor(user));
  }

  @Post(':model/:id/activities')
  schedule(
    @Param() params: RecordParamsDto,
    @Body() dto: ScheduleActivityDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.activity.scheduleActivity(
      params.model,
      params.id,
      dto,
      this.actor(user),
    );
  }

  private actor(user: AuthenticatedUser | undefined): ActivityActor {
    return { id: user?.sub, type: user?.user_type };
  }
}
