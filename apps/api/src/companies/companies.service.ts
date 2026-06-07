import { Injectable } from "@nestjs/common";
import { CreateCompanyDto } from "./dto/create-company.dto";

@Injectable()
export class CompaniesService {
  findAll() {
    return [];
  }

  findOne(id: string) {
    return { id };
  }

  create(dto: CreateCompanyDto) {
    return { ...dto, id: crypto.randomUUID() };
  }
}
