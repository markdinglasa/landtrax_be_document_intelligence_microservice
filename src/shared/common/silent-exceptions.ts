import { NotFoundException, NotImplementedException } from '@nestjs/common';

/*---------------------------------------------------
| This file will contain all the base classes of the  |
| exception logic that will be thrown on the services |
-----------------------------------------------------*/

export class SilentNotFoundException extends NotFoundException {
  public readonly skipLogging = true;
  constructor(message?: string) {
    super(message);
  }
}

export class SilentNotImplementedException extends NotImplementedException {
  public readonly skipLogging = true;
  constructor(message?: string) {
    super(message);
  }
}
