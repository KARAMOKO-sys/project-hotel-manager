import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { PermissionCatalogService } from './permission-catalog.service';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from '../auth.constants';

describe('PermissionCatalogService', () => {
  it('lists module CRUD and explicit permissions, excluding public routes', () => {
    class ReservationController {
      list() {
        return undefined;
      }
      selfCheckIn() {
        return undefined;
      }
      createPublicConversation() {
        return undefined;
      }
    }

    Reflect.defineMetadata(
      PATH_METADATA,
      'reservations',
      ReservationController,
    );
    Reflect.defineMetadata(
      METHOD_METADATA,
      RequestMethod.GET,
      ReservationController.prototype.list,
    );
    Reflect.defineMetadata(
      METHOD_METADATA,
      RequestMethod.PATCH,
      ReservationController.prototype.selfCheckIn,
    );
    Reflect.defineMetadata(
      PERMISSIONS_KEY,
      ['reservations:self-check-in'],
      ReservationController.prototype.selfCheckIn,
    );
    Reflect.defineMetadata(
      METHOD_METADATA,
      RequestMethod.POST,
      ReservationController.prototype.createPublicConversation,
    );
    Reflect.defineMetadata(
      IS_PUBLIC_KEY,
      true,
      ReservationController.prototype.createPublicConversation,
    );

    const discoveryService = {
      getControllers: () => [{ metatype: ReservationController }],
    } as unknown as DiscoveryService;
    const service = new PermissionCatalogService(
      discoveryService,
      new Reflector(),
    );

    expect(service.list()).toEqual([
      {
        module: 'reservations',
        actions: ['read', 'self-check-in'],
        permissions: ['reservations:read', 'reservations:self-check-in'],
      },
    ]);
  });
});
