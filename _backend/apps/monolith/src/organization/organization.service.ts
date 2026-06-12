import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto, UpdateOrganizationDto, AddMemberDto } from './dto/organization.dtos';
import { organizations } from '@prisma/client';
import { OrgMemberWithRole } from './interfaces/organization.interface';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto, user_id: number): Promise<organizations> {
    const org = await this.prisma.organizations.create({ data: { name: dto.name } });
    await this.addMemberToOrg(org.id, user_id, 'owner');
    return org;
  }

  async getById(id: number): Promise<organizations> {
    const org = await this.prisma.organizations.findUnique({
      where: { id, is_deleted: false },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async update(id: number, dto: UpdateOrganizationDto, callerId: number): Promise<organizations> {
    await this.assertIsAdmin(id, callerId);
    const filtered = Object.fromEntries(
      Object.entries({ name: dto.name }).filter(([, value]) => value !== undefined),
    );
    return this.prisma.organizations.update({
      where: { id },
      data: { ...filtered, updated_at: new Date() },
    });
  }

  async delete(id: number, callerId: number): Promise<void> {
    await this.assertIsAdmin(id, callerId);
    await this.prisma.organizations.update({
      where: { id },
      data: { is_deleted: true, deleted_at: new Date() },
    });
  }

  async getMembers(organizationId: number, callerId: number): Promise<OrgMemberWithRole[]> {
    await this.assertIsMember(organizationId, callerId);
    return this.findMembers(organizationId);
  }

  async addMember(organizationId: number, dto: AddMemberDto, callerId: number): Promise<OrgMemberWithRole> {
    await this.assertIsAdmin(organizationId, callerId);
    const existing = await this.findMember(organizationId, dto.user_id);
    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }
    return this.addMemberToOrg(organizationId, dto.user_id, dto.role_type);
  }

  async removeMember(organizationId: number, userId: number, callerId: number): Promise<void> {
    await this.assertIsAdmin(organizationId, callerId);
    const existing = await this.findMember(organizationId, userId);
    if (!existing) {
      throw new NotFoundException('Member not found in this organization');
    }
    await this.prisma.organization_members.deleteMany({
      where: { organization_id: organizationId, user_id: userId },
    });
  }

  private async findMembers(organizationId: number): Promise<OrgMemberWithRole[]> {
    const members = await this.prisma.organization_members.findMany({
      where: { organization_id: organizationId },
      select: {
        id: true,
        user_id: true,
        organization_id: true,
        organization_roles: { select: { code: true } },
      },
    });
    return members.map((m) => ({
      id: m.id,
      user_id: m.user_id,
      organization_id: m.organization_id,
      role_type: m.organization_roles.code,
    }));
  }

  private async findMember(organizationId: number, userId: number): Promise<OrgMemberWithRole | null> {
    const member = await this.prisma.organization_members.findFirst({
      where: { organization_id: organizationId, user_id: userId },
      select: {
        id: true,
        user_id: true,
        organization_id: true,
        organization_roles: { select: { code: true } },
      },
    });
    if (!member) return null;
    return {
      id: member.id,
      user_id: member.user_id,
      organization_id: member.organization_id,
      role_type: member.organization_roles.code,
    };
  }

  private async addMemberToOrg(
    organizationId: number,
    userId: number,
    roleType: string,
  ): Promise<OrgMemberWithRole> {
    const role = await this.prisma.organization_roles.findFirst({
      where: { code: roleType },
      select: { id: true },
    });
    if (!role) throw new Error('Invalid role type');

    const created = await this.prisma.organization_members.create({
      data: { organization_id: organizationId, user_id: userId, role_id: role.id },
      include: { organization_roles: { select: { code: true } } },
    });
    return {
      id: created.id,
      user_id: created.user_id,
      organization_id: created.organization_id,
      role_type: created.organization_roles.code,
    };
  }

  private async assertIsAdmin(organizationId: number, userId: number): Promise<void> {
    const member = await this.findMember(organizationId, userId);
    if (!member || (member.role_type !== 'admin' && member.role_type !== 'owner')) {
      throw new ForbiddenException('You do not have permission in this organization');
    }
  }

  private async assertIsMember(organizationId: number, userId: number): Promise<void> {
    const member = await this.findMember(organizationId, userId);
    if (!member) {
      throw new ForbiddenException('You do not have permission in this organization');
    }
  }
}
