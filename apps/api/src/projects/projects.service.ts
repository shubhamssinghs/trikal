import { Injectable } from "@nestjs/common";
import { CreateProjectDto } from "./dto/create-project.dto";

@Injectable()
export class ProjectsService {
  findAll() {
    return [];
  }

  findOne(id: string) {
    return { id };
  }

  create(dto: CreateProjectDto) {
    return { ...dto, id: crypto.randomUUID() };
  }
}
