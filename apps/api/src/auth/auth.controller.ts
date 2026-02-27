import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { Public } from './decorators/roles.decorator';

class LoginDto {
    @IsEmail()
    declare email: string;

    @IsString()
    @MinLength(6)
    declare password: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Public()
    @Post('login')
    @HttpCode(200)
    @ApiOperation({ summary: 'Login with email and password, returns JWT access token' })
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto.email, dto.password);
    }
}
