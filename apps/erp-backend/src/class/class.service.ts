import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClassDto, UpdateClassDto } from './dto';

@Injectable()
export class ClassService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateClassDto) {
    return this.prisma.class.create({ data: dto });
  }

  findAll() {
    return this.prisma.class.findMany({ where: { deletedAt: null } });
  }

  findOne(id: string) {
    return this.prisma.class.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdateClassDto) {
    return this.prisma.class.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.class.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
