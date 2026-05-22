import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationRepository } from './organization.repository';
import { CreateOrganizationDto, UpdateOrganizationDto, AddMemberDto } from './dto/organization.dtos';
import { organizations } from '@prisma/client';
import { OrgMemberWithRole } from './interfaces/organization.interface';

@Injectable()
export class OrganizationService {
  constructor(private readonly organizationRepository: OrganizationRepository) {}

  async create(dto: CreateOrganizationDto, user_id: number): Promise<organizations> {
    // 1. Create new organization
    const org = await this.organizationRepository.create({ name: dto.name });

    // 2. Add creator as owner
    await this.organizationRepository.addMember({
      organization_id: org.id,
      user_id: user_id,
      role_type: 'owner',
    });
    return org;
  }

  async getById(id: number): Promise<organizations> {
    const org = await this.organizationRepository.findById(id);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async update(id: number, dto: UpdateOrganizationDto, callerId: number): Promise<organizations> {
    // Only admin or owner can update organization
    await this.assertIsAdmin(id, callerId);
    return this.organizationRepository.update(id, { name: dto.name });
  }

  async delete(id: number, callerId: number): Promise<void> {
    // Soft delete the organization
    await this.assertIsAdmin(id, callerId);
    await this.organizationRepository.softDelete(id);
  }

  async getMembers(organizationId: number, callerId: number): Promise<OrgMemberWithRole[]> {
    await this.assertIsMember(organizationId, callerId);
    return this.organizationRepository.findMembers(organizationId);
  }

  async addMember(organizationId: number, dto: AddMemberDto, callerId: number): Promise<OrgMemberWithRole> {
    // Only admin or owner can add members
    await this.assertIsAdmin(organizationId, callerId);
    const existing = await this.organizationRepository.findMember(organizationId, dto.user_id);
    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }

    return this.organizationRepository.addMember({
      organization_id: organizationId,
      user_id: dto.user_id,
      role_type: dto.role_type,
    });
  }

  async removeMember(organizationId: number, userId: number, callerId: number): Promise<void> {
    // Only admin or owner can remove members
    await this.assertIsAdmin(organizationId, callerId);

    const existing = await this.organizationRepository.findMember(organizationId, userId);
    if (!existing) {
      throw new NotFoundException('Member not found in this organization');
    }

    await this.organizationRepository.removeMember(organizationId, userId);
  }

  private async assertIsAdmin(organizationId: number, userId: number): Promise<void> {
    const member = await this.organizationRepository.findMember(organizationId, userId);
    if (!member || (member.role_type !== 'admin' && member.role_type !== 'owner')) {
      throw new ForbiddenException('You do not have permission in this organization');
    }
  }

  private async assertIsMember(organizationId: number, userId: number): Promise<void> {
    const member = await this.organizationRepository.findMember(organizationId, userId);
    if (!member) {
      throw new ForbiddenException('You do not have permission in this organization');
    }
  }
}
