import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';
import * as bodyParser from 'body-parser';

const parseCorsOrigins = (): boolean | string[] => {
  const origin = process.env.CORS_ORIGIN;

  if (!origin) {
    return process.env.NODE_ENV === 'production' ? false : true;
  }

  return origin
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: parseCorsOrigins(),
    credentials: true,
  });
  app.use(bodyParser.json({ limit: '50mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api/hmbtr/v1');
  await app.listen(process.env.PORT ?? process.env.APP_PORT ?? 3000);
}
bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
