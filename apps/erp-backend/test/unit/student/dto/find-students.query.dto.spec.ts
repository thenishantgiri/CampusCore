import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { FindStudentsQueryDto } from 'src/student/dto/find-students.query.dto';

describe('FindStudentsQueryDto', () => {
  it('should be defined', () => {
    expect(new FindStudentsQueryDto()).toBeDefined();
  });

  it('should apply default values for pagination', () => {
    const dto = new FindStudentsQueryDto();
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('should validate and transform page and limit correctly', () => {
    const plainObject = {
      page: '2', // String should be transformed to number
      limit: '20', // String should be transformed to number
    };

    const dto = plainToInstance(FindStudentsQueryDto, plainObject);
    const errors = validateSync(dto);

    expect(errors.length).toBe(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(20);
  });

  it('should reject invalid page and limit values', () => {
    const invalidObject = {
      page: '0', // Below minimum
      limit: '101', // Above maximum
    };

    const dto = plainToInstance(FindStudentsQueryDto, invalidObject);
    const errors = validateSync(dto);

    expect(errors.length).toBe(2);
    expect(errors[0].property).toBe('page');
    expect(errors[1].property).toBe('limit');
  });

  it('should accept valid search parameter', () => {
    const plainObject = {
      search: 'John',
    };

    const dto = plainToInstance(FindStudentsQueryDto, plainObject);
    const errors = validateSync(dto);

    expect(errors.length).toBe(0);
    expect(dto.search).toBe('John');
  });

  it('should accept valid userId parameter', () => {
    const plainObject = {
      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    };

    const dto = plainToInstance(FindStudentsQueryDto, plainObject);
    const errors = validateSync(dto);

    expect(errors.length).toBe(0);
    expect(dto.userId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });

  it('should reject invalid userId format', () => {
    const plainObject = {
      userId: 'not-a-uuid',
    };

    const dto = plainToInstance(FindStudentsQueryDto, plainObject);
    const errors = validateSync(dto);

    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('userId');
  });

  it('should accept valid date range parameters', () => {
    const plainObject = {
      dateOfBirthStart: '2000-01-01',
      dateOfBirthEnd: '2010-12-31',
    };

    const dto = plainToInstance(FindStudentsQueryDto, plainObject);
    const errors = validateSync(dto);

    expect(errors.length).toBe(0);
    expect(dto.dateOfBirthStart).toBe('2000-01-01');
    expect(dto.dateOfBirthEnd).toBe('2010-12-31');
  });

  it('should reject invalid date format', () => {
    const plainObject = {
      dateOfBirthStart: '01-01-2000', // Wrong format
    };

    const dto = plainToInstance(FindStudentsQueryDto, plainObject);
    const errors = validateSync(dto);

    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('dateOfBirthStart');
  });

  it('should accept multiple valid parameters together', () => {
    const plainObject = {
      page: '2',
      limit: '15',
      search: 'Smith',
      dateOfBirthStart: '2000-01-01',
    };

    const dto = plainToInstance(FindStudentsQueryDto, plainObject);
    const errors = validateSync(dto);

    expect(errors.length).toBe(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(15);
    expect(dto.search).toBe('Smith');
    expect(dto.dateOfBirthStart).toBe('2000-01-01');
  });
});
