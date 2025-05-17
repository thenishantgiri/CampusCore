import { Test, TestingModule } from '@nestjs/testing';
import { StudentController } from 'src/student/student.controller';
import { StudentService } from 'src/student/student.service';
import { CreateStudentDto } from 'src/student/dto/create-student.dto';
import { UpdateStudentDto } from 'src/student/dto/update-student.dto';
import { FindStudentsQueryDto } from 'src/student/dto/find-students.query.dto';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from 'src/auth/constants/roles.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';
import { Request } from 'express';

describe('StudentController', () => {
  let controller: StudentController;
  let studentService: StudentService;

  // Mock data
  const mockStudent = {
    id: 'student-123',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '2005-05-15T00:00:00.000Z',
    photoUrl: 'https://example.com/photo.jpg',
    userId: 'user-123',
    emergencyContacts: [
      { name: 'Jane Doe', relation: 'Mother', phone: '+1234567890' },
    ],
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
    user: {
      name: 'John User',
      email: 'john@example.com',
    },
  };

  const mockStudents = [
    mockStudent,
    {
      id: 'student-456',
      firstName: 'Alice',
      lastName: 'Smith',
      dateOfBirth: '2006-02-15T00:00:00.000Z',
      photoUrl: null,
      userId: 'user-456',
      emergencyContacts: [
        { name: 'Bob Smith', relation: 'Father', phone: '+0987654321' },
      ],
      createdAt: '2023-01-02T00:00:00.000Z',
      updatedAt: '2023-01-02T00:00:00.000Z',
      user: {
        name: 'Alice User',
        email: 'alice@example.com',
      },
    },
  ];

  const mockPaginatedResponse = {
    data: mockStudents,
    meta: {
      total: 2,
      page: 1,
      limit: 10,
      pages: 1,
    },
  };

  // Mock request for admin user
  const mockAdminRequest = {
    user: {
      id: 'admin-user',
      role: Role.ADMIN,
    },
  } as unknown as Request;

  // Mock request for student user
  const mockStudentRequest = {
    user: {
      id: 'user-123', // Same ID as mockStudent.userId
      role: Role.STUDENT,
    },
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentController],
      providers: [
        {
          provide: StudentService,
          useValue: {
            createStudent: jest.fn(),
            getAllStudents: jest.fn(),
            getStudentById: jest.fn(),
            updateStudent: jest.fn(),
            deleteStudent: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn().mockReturnValue([]),
            getAllAndOverride: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            student: {
              findUnique: jest.fn().mockResolvedValue({}),
            },
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<StudentController>(StudentController);
    studentService = module.get<StudentService>(StudentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateStudentDto = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '2005-05-15',
      photoUrl: 'https://example.com/photo.jpg',
      userId: 'user-123',
      emergencyContacts: [
        { name: 'Jane Doe', relation: 'Mother', phone: '+1234567890' },
      ],
    };

    it('should create a student successfully', async () => {
      // Arrange
      studentService.createStudent = jest.fn().mockResolvedValue(mockStudent);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(studentService.createStudent).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockStudent);
    });

    it('should forward BadRequestException from service when user already has student profile', async () => {
      // Arrange
      studentService.createStudent = jest
        .fn()
        .mockRejectedValue(
          new BadRequestException(
            'A student profile for this user already exists.',
          ),
        );

      // Act & Assert
      await expect(controller.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(studentService.createStudent).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated students', async () => {
      // Arrange
      const query: FindStudentsQueryDto = { page: 1, limit: 10 };

      studentService.getAllStudents = jest
        .fn()
        .mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(studentService.getAllStudents).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should apply query filters correctly', async () => {
      // Arrange
      const query: FindStudentsQueryDto = {
        page: 1,
        limit: 10,
        search: 'John',
        userId: 'user-123',
        dateOfBirthStart: '2000-01-01',
        dateOfBirthEnd: '2010-12-31',
      };

      studentService.getAllStudents = jest.fn().mockResolvedValue({
        data: [mockStudent],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
        },
      });

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(studentService.getAllStudents).toHaveBeenCalledWith(query);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(mockStudent);
    });
  });

  describe('findOne', () => {
    it('should return a student by id for admin user', async () => {
      // Arrange
      studentService.getStudentById = jest.fn().mockResolvedValue(mockStudent);

      // Act
      const result = await controller.findOne(
        'student-123',
        mockAdminRequest,
        Role.ADMIN,
      );

      // Assert
      expect(studentService.getStudentById).toHaveBeenCalledWith(
        'student-123',
        'admin-user',
        Role.ADMIN,
      );
      expect(result).toEqual(mockStudent);
    });

    it('should return a student for student user accessing own profile', async () => {
      // Arrange
      studentService.getStudentById = jest.fn().mockResolvedValue(mockStudent);

      // Act
      const result = await controller.findOne(
        'student-123',
        mockStudentRequest,
        Role.STUDENT,
      );

      // Assert
      expect(studentService.getStudentById).toHaveBeenCalledWith(
        'student-123',
        'user-123',
        Role.STUDENT,
      );
      expect(result).toEqual(mockStudent);
    });

    it('should forward NotFoundException from service', async () => {
      // Arrange
      studentService.getStudentById = jest
        .fn()
        .mockRejectedValue(new NotFoundException('Student not found'));

      // Act & Assert
      await expect(
        controller.findOne('nonexistent-id', mockAdminRequest, Role.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });

    it('should forward ForbiddenException when student tries to access another student profile', async () => {
      // Arrange
      studentService.getStudentById = jest
        .fn()
        .mockRejectedValue(
          new ForbiddenException(
            'You can only access your own student profile',
          ),
        );

      // Act & Assert
      await expect(
        controller.findOne('student-456', mockStudentRequest, Role.STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateStudentDto = {
      firstName: 'Jonathan',
      lastName: 'Doeson',
    };

    it('should update a student successfully', async () => {
      // Arrange
      const updatedStudent = {
        ...mockStudent,
        firstName: 'Jonathan',
        lastName: 'Doeson',
      };

      studentService.updateStudent = jest
        .fn()
        .mockResolvedValue(updatedStudent);

      // Act
      const result = await controller.update(
        'student-123',
        updateDto,
        mockAdminRequest,
        Role.ADMIN,
      );

      // Assert
      expect(studentService.updateStudent).toHaveBeenCalledWith(
        'student-123',
        updateDto,
        'admin-user',
        Role.ADMIN,
      );
      expect(result).toEqual(updatedStudent);
    });

    it('should forward NotFoundException when student not found', async () => {
      // Arrange
      studentService.updateStudent = jest
        .fn()
        .mockRejectedValue(new NotFoundException('Student not found'));

      // Act & Assert
      await expect(
        controller.update(
          'nonexistent-id',
          updateDto,
          mockAdminRequest,
          Role.ADMIN,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should forward BadRequestException for invalid update data', async () => {
      // Arrange
      studentService.updateStudent = jest
        .fn()
        .mockRejectedValue(new BadRequestException('Invalid date format'));

      // Act & Assert
      await expect(
        controller.update(
          'student-123',
          { dateOfBirth: 'invalid-date' } as UpdateStudentDto,
          mockAdminRequest,
          Role.ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a student successfully', async () => {
      // Arrange
      studentService.deleteStudent = jest.fn().mockResolvedValue(mockStudent);

      // Act
      const result = await controller.remove(
        'student-123',
        mockAdminRequest,
        Role.ADMIN,
      );

      // Assert
      expect(studentService.deleteStudent).toHaveBeenCalledWith(
        'student-123',
        'admin-user',
        Role.ADMIN,
      );
      expect(result).toEqual(mockStudent);
    });

    it('should forward NotFoundException when student not found', async () => {
      // Arrange
      studentService.deleteStudent = jest
        .fn()
        .mockRejectedValue(new NotFoundException('Student not found'));

      // Act & Assert
      await expect(
        controller.remove('nonexistent-id', mockAdminRequest, Role.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });

    it('should forward ForbiddenException when user does not have permission', async () => {
      // Arrange
      studentService.deleteStudent = jest
        .fn()
        .mockRejectedValue(
          new ForbiddenException(
            'You do not have permission to delete this student',
          ),
        );

      // Act & Assert
      await expect(
        controller.remove('student-123', mockStudentRequest, Role.STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
