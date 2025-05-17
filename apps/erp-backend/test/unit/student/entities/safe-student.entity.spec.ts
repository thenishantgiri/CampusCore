import { plainToInstance } from 'class-transformer';
import { SafeStudentEntity } from 'src/student/entities/safe-student.entity';

describe('SafeStudentEntity', () => {
  it('should be defined', () => {
    // Only check if the entity is imported properly
    expect(SafeStudentEntity).toBeDefined();
  });

  it('should properly transform a valid student object', () => {
    const studentData = {
      id: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '2005-09-01T00:00:00.000Z',
      photoUrl: 'https://cdn.example.com/photos/john-doe.jpg',
      emergencyContacts: [
        { name: 'Jane Doe', relation: 'Mother', phone: '+1234567890' },
      ],
      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      createdAt: '2025-05-08T12:34:56.789Z',
      updatedAt: '2025-05-08T12:34:56.789Z',
    };

    const entity = plainToInstance(SafeStudentEntity, studentData);

    // Test that all properties are transferred to the entity
    expect(entity).toMatchObject(studentData);
  });

  it('should correctly handle a student without optional fields', () => {
    const studentDataWithoutOptionals = {
      id: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '2005-09-01T00:00:00.000Z',
      emergencyContacts: [
        { name: 'Jane Doe', relation: 'Mother', phone: '+1234567890' },
      ],
      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      createdAt: '2025-05-08T12:34:56.789Z',
      updatedAt: '2025-05-08T12:34:56.789Z',
    };

    const entity = plainToInstance(
      SafeStudentEntity,
      studentDataWithoutOptionals,
    );

    // Test that all properties are transferred as expected
    expect(entity.id).toBe(studentDataWithoutOptionals.id);
    expect(entity.photoUrl).toBeUndefined();
    expect(entity.firstName).toBe(studentDataWithoutOptionals.firstName);
  });
});
