import { User } from 'src/users/entities/user.entity';

export function toUserResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    departmentId: user.departmentId,
    createdAt: user.createdAt,
  };
}
