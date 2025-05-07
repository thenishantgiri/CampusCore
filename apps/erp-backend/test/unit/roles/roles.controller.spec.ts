import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from 'src/roles/roles.controller';
import { RolesService } from 'src/roles/roles.service';
import { CreateRoleDto } from 'src/roles/dto/create-role.dto';
import { UpdateRoleDto } from 'src/roles/dto/update-role.dto';
import { RoleType } from 'generated/prisma';

// import the real guards so we can override them
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';

describe('RolesController', () => {
  let controller: RolesController;
  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [{ provide: RolesService, useValue: mockService }],
    })
      // override each guard with a stub that always allows
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(RolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create()', () => {
    it('calls service.create and returns its result', async () => {
      const dto: CreateRoleDto = {
        name: 'Test Role',
        type: RoleType.CUSTOM,
        permissions: ['a:read'],
      };
      const expected = {
        id: 'role-test',
        name: dto.name,
        type: dto.type,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('findAll()', () => {
    it('calls service.findAll and returns its result', async () => {
      const roles = [
        { id: 'r1', name: 'One', type: RoleType.CUSTOM },
        { id: 'r2', name: 'Two', type: RoleType.STATIC },
      ];
      mockService.findAll.mockResolvedValue(roles);

      const result = await controller.findAll();

      expect(mockService.findAll).toHaveBeenCalled();
      expect(result).toEqual(roles);
    });
  });

  describe('update()', () => {
    it('calls service.update and returns its result', async () => {
      const id = 'role-1';
      const dto: UpdateRoleDto = { name: 'Updated', permissions: ['x'] };
      const updated = {
        id,
        name: dto.name!,
        type: RoleType.CUSTOM,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.update.mockResolvedValue(updated);

      const result = await controller.update(id, dto);

      expect(mockService.update).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('delete()', () => {
    it('calls service.delete and returns its result', async () => {
      const id = 'role-42';
      const deleted = {
        id,
        name: 'Gone',
        type: RoleType.CUSTOM,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.delete.mockResolvedValue(deleted);

      const result = await controller.deleteRole(id);

      expect(mockService.delete).toHaveBeenCalledWith(id);
      expect(result).toEqual(deleted);
    });
  });
});
