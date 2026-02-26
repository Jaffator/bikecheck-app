function createTestUser(overrides?: Partial<CreateUserDto>): CreateUserDto {
  return {
    name: 'Test User',
    email: `user${Date.now()}@example.com`,
    password: 'StrongPass123',
    ...overrides,
  };
}

const testUser = createTestUser({ name: 'ahoj' });
console.log(testUser);
