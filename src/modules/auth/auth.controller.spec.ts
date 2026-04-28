import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<AuthService>;

  beforeEach(async () => {
    authService = {
      validateUser: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      googleLogin: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      getMe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return token if validation succeeds', async () => {
      const dto = { email: 'test@test.com', password: 'pass' };
      const mockUser = { id: 1, email: 'test@test.com' };
      const mockToken = { access_token: 'jwtoken' };

      (authService.validateUser as jest.Mock).mockResolvedValue(mockUser);
      (authService.login as jest.Mock).mockResolvedValue(mockToken);

      const result = await controller.login(dto);
      expect(result).toEqual(mockToken);
      expect(authService.validateUser).toHaveBeenCalledWith(dto.email, dto.password);
      expect(authService.login).toHaveBeenCalledWith(mockUser);
    });

    it('should throw UnauthorizedException if validation fails', async () => {
      const dto = { email: 'wrong@test.com', password: 'pass' };
      (authService.validateUser as jest.Mock).mockResolvedValue(null);

      await expect(controller.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create a user', async () => {
      const dto = { email: 'new@test.com', password: 'pass', name: 'New' };
      const mockResult = { id: 1, ...dto };
      
      (authService.register as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.register(dto);
      expect(result).toEqual(mockResult);
    });

    it('should throw Conflict error if email exists', async () => {
        const dto = { email: 'exist@test.com', password: 'pass', name: 'Exist' };
        const error = { code: 'P2002' }; // Prisma unique constraint error code
        
        (authService.register as jest.Mock).mockRejectedValue(error);
  
        await expect(controller.register(dto)).rejects.toThrow(HttpException);
        await expect(controller.register(dto)).rejects.toThrow('El correo ya está registrado');
      });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword', async () => {
      const dto = { email: 'test@test.com' };
      (authService.forgotPassword as jest.Mock).mockResolvedValue({ message: 'sent' });

      expect(await controller.forgotPassword(dto)).toEqual({ message: 'sent' });
      expect(authService.forgotPassword).toHaveBeenCalledWith(dto.email);
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword', async () => {
      const dto = { token: 'tok', newPassword: 'pass' };
      (authService.resetPassword as jest.Mock).mockResolvedValue({ message: 'success' });

      expect(await controller.resetPassword(dto)).toEqual({ message: 'success' });
      expect(authService.resetPassword).toHaveBeenCalledWith(dto.token, dto.newPassword);
    });
  });

  describe('getMe', () => {
    it('should return the authenticated user data', async () => {
      const mockUser = { id: 1, email: 'test@test.com', name: 'Test', role: 'user', profileComplete: true };
      (authService.getMe as jest.Mock).mockResolvedValue(mockUser);

      const req = { user: { userId: 1 } };
      const result = await controller.getMe(req);

      expect(result).toEqual(mockUser);
      expect(authService.getMe).toHaveBeenCalledWith(1);
    });
  });
});
