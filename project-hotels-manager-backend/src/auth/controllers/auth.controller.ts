import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import {
  ChangePasswordDto,
  EmailRequestDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  TokenDto,
  TwoFactorCodeDto,
  VerifyTwoFactorLoginDto,
} from '../dto/auth.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Client } from '../decorators/client-info.decorator';
import type { ClientInfo } from '../decorators/client-info.decorator';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Routes d'authentification. Toutes exigent un jeton Bearer, sauf celles
 * marquées `@Public()`.
 */
@ApiTags('Auth')
@UseGuards(JwtAuthGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ---------------------------------------------------------------- public

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto, @Client() client: ClientInfo) {
    return this.authService.register(dto, client);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Client() client: ClientInfo) {
    return this.authService.login(dto, client);
  }

  @Public()
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  verifyTwoFactor(
    @Body() dto: VerifyTwoFactorLoginDto,
    @Client() client: ClientInfo,
  ) {
    return this.authService.verifyTwoFactorLogin(dto, client);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto, @Client() client: ClientInfo) {
    return this.authService.refresh(dto.refresh_token, client);
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: EmailRequestDto, @Client() client: ClientInfo) {
    return this.authService.requestPasswordReset(dto, client);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  magicLink(@Body() dto: EmailRequestDto, @Client() client: ClientInfo) {
    return this.authService.generateMagicLink(dto, client);
  }

  @Public()
  @Post('magic-link/verify')
  @HttpCode(HttpStatus.OK)
  verifyMagicLink(@Body() dto: TokenDto, @Client() client: ClientInfo) {
    return this.authService.loginWithMagicLink(dto.token, client);
  }

  @Public()
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: TokenDto) {
    return this.authService.verifyEmail(dto.token);
  }

  // ---------------------------------------------------------- authentifié

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user);
  }

  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  logoutAll(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logoutAll(user);
  }

  @ApiBearerAuth()
  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user, dto);
  }

  @ApiBearerAuth()
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  enableTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.enableTwoFactor(user);
  }

  @ApiBearerAuth()
  @Post('2fa/confirm')
  @HttpCode(HttpStatus.OK)
  confirmTwoFactor(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TwoFactorCodeDto,
  ) {
    return this.authService.confirmTwoFactor(user, dto.code);
  }

  @ApiBearerAuth()
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  disableTwoFactor(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TwoFactorCodeDto,
  ) {
    return this.authService.disableTwoFactor(user, dto.code);
  }
}
