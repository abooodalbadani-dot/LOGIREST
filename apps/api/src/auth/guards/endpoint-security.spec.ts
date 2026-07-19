import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { MetadataScanner } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ALL_ROLES_KEY } from '../decorators/all-roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const PATH_METADATA = 'path';
const METHOD_METADATA = 'method';

describe('Endpoint Security Decorators Audit', () => {
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterAll(async () => {
    if (moduleFixture) {
      await moduleFixture.close();
    }
  });

  it('every route handler must have at least one access decorator (@Roles, @AllRoles, or @Public)', () => {
    const container = (moduleFixture as any).container;
    const modules = container.getModules();
    const metadataScanner = new MetadataScanner();

    const missingEndpoints: string[] = [];

    for (const [moduleName, moduleInstance] of modules.entries()) {
      const controllers = moduleInstance.controllers;
      for (const [controllerName, wrapper] of controllers.entries()) {
        const instance = wrapper.instance;
        if (!instance) continue;
        const prototype = Object.getPrototypeOf(instance);
        if (!prototype) continue;

        // Retrieve method names of the controller class
        const methodNames = metadataScanner.getAllMethodNames(prototype);

        for (const methodName of methodNames) {
          const methodRef = prototype[methodName];
          if (!methodRef || typeof methodRef !== 'function') continue;

          // Check if it has a route mapping decorator
          const path = Reflect.getMetadata(PATH_METADATA, methodRef);
          const requestMethod = Reflect.getMetadata(METHOD_METADATA, methodRef);

          if (path !== undefined || requestMethod !== undefined) {
            // Check if there is @Public, @AllRoles, or @Roles on the method itself,
            // OR if the class itself is decorated.
            const hasPublicMethod = Reflect.getMetadata(IS_PUBLIC_KEY, methodRef);
            const hasPublicClass = Reflect.getMetadata(IS_PUBLIC_KEY, instance.constructor);
            
            const hasAllRolesMethod = Reflect.getMetadata(ALL_ROLES_KEY, methodRef);
            const hasAllRolesClass = Reflect.getMetadata(ALL_ROLES_KEY, instance.constructor);

            const hasRolesMethod = Reflect.getMetadata(ROLES_KEY, methodRef);
            const hasRolesClass = Reflect.getMetadata(ROLES_KEY, instance.constructor);

            const isProtected =
              hasPublicMethod ||
              hasPublicClass ||
              hasAllRolesMethod ||
              hasAllRolesClass ||
              (hasRolesMethod && hasRolesMethod.length > 0) ||
              (hasRolesClass && hasRolesClass.length > 0);

            if (!isProtected) {
              missingEndpoints.push(
                `${instance.constructor.name}.${methodName} [Path: ${path}, Method: ${requestMethod}]`
              );
            }
          }
        }
      }
    }

    if (missingEndpoints.length > 0) {
      console.error('Naked endpoints found without decorators:\n' + missingEndpoints.join('\n'));
    }

    expect(missingEndpoints).toEqual([]);
  });
});
