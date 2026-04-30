import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { organizations } from '@prisma/client';
import {
  CreateOrganizationData,
  UpdateOrganizationData,
  AddMemberData,
  OrgMemberWithRole,
} from './interfaces/organization.interface';

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOrganizationData): Promise<organizations> {
    return this.prisma.organizations.create({ data });
  }

  async findById(id: number): Promise<organizations | null> {
    return this.prisma.organizations.findUnique({
      where: { id, is_deleted: false },
    });
  }

  async update(id: number, data: UpdateOrganizationData): Promise<organizations> {
    const filtered = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));

    return this.prisma.organizations.update({
      where: { id },
      data: { ...filtered, updated_at: new Date() },
    });
  }

  async softDelete(id: number): Promise<organizations> {
    return this.prisma.organizations.update({
      where: { id },
      data: { is_deleted: true, deleted_at: new Date() },
    });
  }

  async findMembers(organizationId: number): Promise<OrgMemberWithRole[]> {
    const members = await this.prisma.organization_members.findMany({
      where: { organization_id: organizationId },
      select: {
        id: true,
        user_id: true,
        organization_id: true,
        organization_roles: {
          select: {
            code: true,
          },
        },
      },
    });

    // return map members with role type
    return members.map((member) => ({
      id: member.id,
      user_id: member.user_id,
      organization_id: member.organization_id,
      role_type: member.organization_roles.code,
    }));
  }

  async findMember(organizationId: number, userId: number): Promise<OrgMemberWithRole | null> {
    const member = await this.prisma.organization_members.findFirst({
      where: { organization_id: organizationId, user_id: userId },
      select: {
        id: true,
        user_id: true,
        organization_id: true,
        organization_roles: {
          select: {
            code: true,
          },
        },
      },
    });
    if (!member) {
      return null;
    }

    // return map member with role type
    return {
      id: member.id,
      user_id: member.user_id,
      organization_id: member.organization_id,
      role_type: member.organization_roles.code,
    };
  }

  async addMember(data: AddMemberData): Promise<OrgMemberWithRole> {
    const roleID = await this.prisma.organization_roles.findFirst({
      where: { code: data.role_type },
      select: { id: true },
    });
    if (!roleID) {
      throw new Error('Invalid role type');
    }

    const created = await this.prisma.organization_members.create({
      data: {
        organization_id: data.organization_id,
        user_id: data.user_id,
        role_id: roleID.id,
      },
      include: {
        organization_roles: {
          select: { code: true },
        },
      },
    });

    return {
      id: created.id,
      user_id: created.user_id,
      organization_id: created.organization_id,
      role_type: created.organization_roles.code,
    };
  }

  async removeMember(organizationId: number, userId: number): Promise<void> {
    await this.prisma.organization_members.deleteMany({
      where: { organization_id: organizationId, user_id: userId },
    });
  }
}
