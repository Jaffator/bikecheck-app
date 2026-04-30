// Controller - only http handling
// Routing, parsing requests, calling Services
// No Business logic

import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import {
  AddMemberDto,
  CreateOrganizationDto,
  OrganizationMemberResponseDto,
  OrganizationResponseDto,
  UpdateOrganizationDto,
} from './dto/organization.dtos';
import { organizations } from '@prisma/client';
import { OrgMemberWithRole } from './interfaces/organization.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  // ---------- POST organization/create ----------
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({ status: 201, type: OrganizationResponseDto })
  @Post()
  async createOrganization(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser('userId') userId: string,
  ): Promise<OrganizationResponseDto> {
    const org = await this.organizationService.create(dto, Number(userId));
    return this.mapToResponse(org);
  }

  // ---------- POST organization/:id/members ----------
  @ApiOperation({ summary: 'Add a member to organization' })
  @ApiResponse({ status: 201, type: OrganizationMemberResponseDto })
  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser('userId') userId: string,
  ): Promise<OrganizationMemberResponseDto> {
    const member = await this.organizationService.addMember(Number(id), dto, Number(userId));
    return this.mapMemberToResponse(member);
  }

  // ---------- GET organization/:id/members ----------
  @ApiOperation({ summary: 'Get members of an organization' })
  @ApiResponse({ status: 200, type: [OrganizationMemberResponseDto] })
  @Get(':id/members')
  async getMembers(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<OrganizationMemberResponseDto[]> {
    const members = await this.organizationService.getMembers(Number(id), Number(userId));
    return members.map((m) => this.mapMemberToResponse(m));
  }

  // ---------- GET organization/:id ----------
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  @Get(':id')
  async getOrganization(@Param('id') id: string): Promise<OrganizationResponseDto> {
    const org = await this.organizationService.getById(Number(id));
    return this.mapToResponse(org);
  }

  // ---------- PATCH organization/:id ----------
  @ApiOperation({ summary: 'Update organization by ID' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  @Patch(':id')
  async updateOrganization(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser('userId') userId: string,
  ): Promise<OrganizationResponseDto> {
    const org = await this.organizationService.update(Number(id), dto, Number(userId));
    return this.mapToResponse(org);
  }

  // ---------- DELETE organization/:id ----------
  @ApiOperation({ summary: 'Soft delete organization by ID' })
  @ApiResponse({ status: 204 })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrganization(@Param('id') id: string, @CurrentUser('userId') userId: string): Promise<void> {
    await this.organizationService.delete(Number(id), Number(userId));
  }

  // ---------- DELETE organization/:id/members/:userId ----------
  @ApiOperation({ summary: 'Remove a member from organization' })
  @ApiResponse({ status: 204 })
  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser('userId') callerId: string,
  ): Promise<void> {
    await this.organizationService.removeMember(Number(id), Number(userId), Number(callerId));
  }

  private mapToResponse(org: organizations): OrganizationResponseDto {
    return {
      id: org.id,
      name: org.name,
      created_at: org.created_at,
      updated_at: org.updated_at,
    };
  }

  private mapMemberToResponse(member: OrgMemberWithRole): OrganizationMemberResponseDto {
    return {
      id: member.id,
      user_id: member.user_id,
      organization_id: member.organization_id,
      role_type: member.role_type,
    };
  }
}
