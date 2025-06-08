import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSectionDto, UpdateSectionDto } from './dto';

@Injectable()
export class SectionService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateSectionDto) {
    return this.prisma.section.create({ data: dto });
  }

  findByClass(classId: string) {
    return this.prisma.section.findMany({
      where: { classId, deletedAt: null },
    });
  }

  update(id: string, dto: UpdateSectionDto) {
    return this.prisma.section.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.section.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
