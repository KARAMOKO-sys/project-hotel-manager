import { BadRequestException } from "@nestjs/common";
import { Model } from "mongoose";
import { SiteConfigRecord } from "../schemas/site-config.entity";
import {
  DEFAULT_SITE_CONFIG,
  SiteConfig,
} from "../site-config.types";
import { SiteConfigService } from "./site-config.service";

describe("SiteConfigService", () => {
  let service: SiteConfigService;
  let findOneExec: jest.Mock;
  let updateExec: jest.Mock;
  let model: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };

  beforeEach(() => {
    findOneExec = jest.fn();
    updateExec = jest.fn();
    const publicQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: findOneExec,
    };
    const updateQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: updateExec,
    };
    model = {
      findOne: jest.fn().mockReturnValue(publicQuery),
      findOneAndUpdate: jest.fn().mockReturnValue(updateQuery),
    };
    service = new SiteConfigService(
      model as unknown as Model<SiteConfigRecord>,
    );
  });

  it("returns the default configuration before the first publication", async () => {
    findOneExec.mockResolvedValue(null);

    await expect(service.findPublic()).resolves.toEqual({
      config: DEFAULT_SITE_CONFIG,
      updated_at: null,
    });
    expect(model.findOne).toHaveBeenCalledWith({ key: "default" });
  });

  it("validates and persists the complete configuration", async () => {
    const config: SiteConfig = {
      ...DEFAULT_SITE_CONFIG,
      brandName: "Hôtel du Lac",
      primaryColor: "#123456",
    };
    const updatedAt = new Date("2026-10-17T00:00:00.000Z");
    updateExec.mockResolvedValue({
      config,
      updated_at: updatedAt,
    });

    await expect(service.update(config)).resolves.toEqual({
      config,
      updated_at: updatedAt.toISOString(),
    });
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { key: "default" },
      { $set: { config } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  });

  it("rejects invalid theme colors before writing", async () => {
    const invalidConfig = {
      ...DEFAULT_SITE_CONFIG,
      primaryColor: "url(javascript:alert(1))",
    };

    await expect(service.update(invalidConfig)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
