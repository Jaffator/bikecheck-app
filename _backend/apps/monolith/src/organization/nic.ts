const member = {
  id: 2,
  user_id: 3,
  organization_id: 10,
  organization_roles: {
    code: 'owner',
  },
};

const mapMember = {
  id: member.id,
  user_id: member.user_id,
  organization_id: member.organization_id,
  role_type: member.organization_roles.code,
};
console.log(mapMember);
