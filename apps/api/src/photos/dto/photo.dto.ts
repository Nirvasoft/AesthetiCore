import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PhotoType {
    BEFORE = 'before',
    AFTER = 'after',
    PROGRESS = 'progress',
}

export class UploadPhotoDto {
    @ApiProperty()
    @IsString()
    patientId!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    sessionId?: string;

    @ApiPropertyOptional({ enum: ['face', 'forehead', 'eyes', 'nose', 'lips', 'chin', 'cheeks', 'neck', 'chest', 'abdomen', 'arms', 'hands', 'legs', 'back', 'other'] })
    @IsOptional()
    @IsString()
    bodyZone?: string;

    @ApiPropertyOptional({ enum: PhotoType })
    @IsOptional()
    @IsString()
    photoType?: string;
}

export class UpdatePhotoDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bodyZone?: string;

    @ApiPropertyOptional({ enum: PhotoType })
    @IsOptional()
    @IsString()
    photoType?: string;
}

export class PhotoSearchDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bodyZone?: string;

    @ApiPropertyOptional({ enum: PhotoType })
    @IsOptional()
    @IsString()
    photoType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    sessionId?: string;
}
