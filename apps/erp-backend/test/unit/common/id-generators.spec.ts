// id-generators.spec.ts
import { generateRoleId } from 'src/common/utils/id-generators';

describe('ID Generators', () => {
  describe('generateRoleId', () => {
    it('should generate a valid role ID from a name', () => {
      // Arrange
      const roleName = 'Admin Role';

      // Act
      const roleId = generateRoleId(roleName);

      // Assert
      expect(roleId).toBe('role-admin-role');
    });

    it('should handle multiple spaces in role names', () => {
      // Arrange
      const roleName = 'Admin    Multiple   Spaces';

      // Act
      const roleId = generateRoleId(roleName);

      // Assert
      expect(roleId).toBe('role-admin-multiple-spaces');
    });

    it('should convert uppercase to lowercase', () => {
      // Arrange
      const roleName = 'ADMIN ROLE';

      // Act
      const roleId = generateRoleId(roleName);

      // Assert
      expect(roleId).toBe('role-admin-role');
    });

    it('should preserve numbers but remove special characters', () => {
      // Arrange
      const roleName = 'Special@Role#123';

      // Act
      const roleId = generateRoleId(roleName);

      // Assert
      expect(roleId).toBe('role-specialrole123');
    });

    it('should handle empty string input', () => {
      // Arrange
      const roleName = '';

      // Act
      const roleId = generateRoleId(roleName);

      // Assert
      expect(roleId).toBe('role');
    });

    it('should handle leading and trailing spaces', () => {
      // Arrange
      const roleName = '  Admin Role  ';

      // Act
      const roleId = generateRoleId(roleName);

      // Assert
      expect(roleId).toBe('role-admin-role');
    });

    it('should convert multiple consecutive hyphens to a single hyphen', () => {
      // Arrange
      const roleName = 'Admin -- Role';

      // Act
      const roleId = generateRoleId(roleName);

      // Assert
      expect(roleId).toBe('role-admin-role');
    });

    it('should handle names with numbers', () => {
      // Arrange
      const roleName = 'Level 2 Admin';

      // Act
      const roleId = generateRoleId(roleName);

      // Assert
      expect(roleId).toBe('role-level-2-admin');
    });
  });
});
