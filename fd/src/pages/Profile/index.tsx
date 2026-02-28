import {
	KeyRound,
	Loader2,
	Lock,
	LogOut,
	Mail,
	PanelsTopLeft,
	Pencil,
	User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { handleApiError } from "@/lib/error";
import {
	validateCodeWithError,
	validateConfirmPassword,
	validateEmailWithError,
	validatePasswordWithError,
	validateUsernameWithError,
} from "@/lib/validation";
import { userApi } from "../../api/user";
import { useAuthStore } from "../../stores/authStore";
import type {
	SendCodeRequest,
	UpdateEmailRequest,
	UpdatePasswordRequest,
} from "../../types";

// 修改框展开状态
type EditField = "username" | "email" | "password" | null;

export default function Profile() {
	const navigate = useNavigate();
	const { user, logout, hasScope, setUser } = useAuthStore();

	// 当前展开的修改框
	const [editingField, setEditingField] = useState<EditField>(null);

	// 修改用户名
	const [username, setUsername] = useState(user?.username || "");
	const [usernameError, setUsernameError] = useState("");
	const [usernameLoading, setUsernameLoading] = useState(false);

	// 修改邮箱
	const [newEmail, setNewEmail] = useState("");
	const [emailCode, setEmailCode] = useState("");
	const [sendingEmailCode, setSendingEmailCode] = useState(false);
	const [emailCountdown, setEmailCountdown] = useState(0);
	const [emailLoading, setEmailLoading] = useState(false);
	const [newEmailError, setNewEmailError] = useState("");
	const [emailCodeError, setEmailCodeError] = useState("");
	const emailTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// 修改密码
	const [passwordCode, setPasswordCode] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [sendingPasswordCode, setSendingPasswordCode] = useState(false);
	const [passwordCountdown, setPasswordCountdown] = useState(0);
	const [passwordLoading, setPasswordLoading] = useState(false);
	const [passwordCodeError, setPasswordCodeError] = useState("");
	const [newPasswordError, setNewPasswordError] = useState("");
	const [confirmPasswordError, setConfirmPasswordError] = useState("");
	const passwordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// 倒计时清理
	useEffect(() => {
		return () => {
			if (emailTimerRef.current) {
				clearInterval(emailTimerRef.current);
			}
			if (passwordTimerRef.current) {
				clearInterval(passwordTimerRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (user) {
			setUsername(user.username);
		}
	}, [user]);

	// 关闭所有修改框并重置状态
	const closeAllEdits = () => {
		setEditingField(null);
		setUsername(user?.username || "");
		setUsernameError("");
		setNewEmail("");
		setEmailCode("");
		setEmailCodeError("");
		setNewEmailError("");
		setPasswordCode("");
		setNewPassword("");
		setConfirmPassword("");
		setPasswordCodeError("");
		setNewPasswordError("");
		setConfirmPasswordError("");
	};

	// 打开指定修改框
	const openEdit = (field: EditField) => {
		closeAllEdits();
		setEditingField(field);
	};

	const handleLogout = async () => {
		await logout();
		toast.success("已登出");
		navigate("/login");
	};

	// 处理用户名输入变化
	const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setUsername(value);
		const result = validateUsernameWithError(value);
		setUsernameError(value ? result.error : "");
	};

	const updateUsername: React.SubmitEventHandler<HTMLFormElement> = async (
		e,
	) => {
		e.preventDefault();

		// 前置校验
		const result = validateUsernameWithError(username);
		if (!result.valid) {
			setUsernameError(result.error);
			toast.error(result.error);
			return;
		}

		setUsernameLoading(true);
		try {
			await userApi.updateUsername({ username });
			toast.success("用户名修改成功");
			const response = await userApi.getMe();
			setUser(response.data);
			closeAllEdits();
		} catch (error: unknown) {
			handleApiError(error, "修改失败");
		} finally {
			setUsernameLoading(false);
		}
	};

	// 处理新邮箱输入变化
	const handleNewEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const email = e.target.value;
		setNewEmail(email);
		const result = validateEmailWithError(email);
		setNewEmailError(email ? result.error : "");
	};

	// 处理邮箱验证码输入变化
	const handleEmailCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const code = e.target.value;
		setEmailCode(code);
		if (!code) {
			setEmailCodeError("");
			return;
		}
		const result = validateCodeWithError(code);
		setEmailCodeError(result.error);
	};

	const sendEmailCode = async () => {
		// 前置校验
		const result = validateEmailWithError(newEmail);
		if (!result.valid) {
			setNewEmailError(result.error);
			toast.error(result.error);
			return;
		}

		setSendingEmailCode(true);
		try {
			const data: SendCodeRequest = { email: newEmail, type: "reset_email" };
			await userApi.sendEmailCode(data);
			toast.success("验证码已发送");
			setEmailCountdown(60);
			if (emailTimerRef.current) clearInterval(emailTimerRef.current);
			emailTimerRef.current = setInterval(() => {
				setEmailCountdown((prev) => {
					if (prev <= 1) {
						if (emailTimerRef.current) clearInterval(emailTimerRef.current);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		} catch (error: unknown) {
			handleApiError(error, "发送失败");
		} finally {
			setSendingEmailCode(false);
		}
	};

	const updateEmail: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
		e.preventDefault();

		// 前置校验
		const codeResult = validateCodeWithError(emailCode);
		if (!codeResult.valid) {
			setEmailCodeError(codeResult.error);
			toast.error(codeResult.error);
			return;
		}

		setEmailLoading(true);
		try {
			const data: UpdateEmailRequest = { email: newEmail, code: emailCode };
			await userApi.updateEmail(data);
			toast.success("邮箱修改成功");
			const response = await userApi.getMe();
			setUser(response.data);
			closeAllEdits();
		} catch (error: unknown) {
			handleApiError(error, "修改失败");
		} finally {
			setEmailLoading(false);
		}
	};

	// 处理密码验证码输入变化
	const handlePasswordCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const code = e.target.value;
		setPasswordCode(code);
		if (!code) {
			setPasswordCodeError("");
			return;
		}
		const result = validateCodeWithError(code);
		setPasswordCodeError(result.error);
	};

	// 处理新密码输入变化
	const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const password = e.target.value;
		setNewPassword(password);
		const result = validatePasswordWithError(password);
		setNewPasswordError(password ? result.error : "");
		// 联动校验确认密码
		if (confirmPassword) {
			const confirmResult = validateConfirmPassword(password, confirmPassword);
			setConfirmPasswordError(confirmResult.error);
		}
	};

	// 处理确认密码输入变化
	const handleConfirmPasswordChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const value = e.target.value;
		setConfirmPassword(value);
		const result = validateConfirmPassword(newPassword, value);
		setConfirmPasswordError(value && newPassword ? result.error : "");
	};

	const sendPasswordCode = async () => {
		if (!user?.email) {
			toast.error("用户邮箱不存在");
			return;
		}

		setSendingPasswordCode(true);
		try {
			const data: SendCodeRequest = {
				email: user.email,
				type: "reset_password",
			};
			await userApi.sendEmailCode(data);
			toast.success("验证码已发送");
			setPasswordCountdown(60);
			if (passwordTimerRef.current) clearInterval(passwordTimerRef.current);
			passwordTimerRef.current = setInterval(() => {
				setPasswordCountdown((prev) => {
					if (prev <= 1) {
						if (passwordTimerRef.current)
							clearInterval(passwordTimerRef.current);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		} catch (error: unknown) {
			handleApiError(error, "发送失败");
		} finally {
			setSendingPasswordCode(false);
		}
	};

	const updatePassword: React.SubmitEventHandler<HTMLFormElement> = async (
		e,
	) => {
		e.preventDefault();

		if (!user?.email) {
			toast.error("用户邮箱不存在");
			return;
		}

		// 前置校验
		const codeResult = validateCodeWithError(passwordCode);
		if (!codeResult.valid) {
			setPasswordCodeError(codeResult.error);
			toast.error(codeResult.error);
			return;
		}

		const passwordResult = validatePasswordWithError(newPassword);
		if (!passwordResult.valid) {
			setNewPasswordError(passwordResult.error);
			toast.error(passwordResult.error);
			return;
		}

		const confirmResult = validateConfirmPassword(newPassword, confirmPassword);
		if (!confirmResult.valid) {
			setConfirmPasswordError(confirmResult.error);
			toast.error(confirmResult.error);
			return;
		}

		setPasswordLoading(true);
		try {
			const data: UpdatePasswordRequest = {
				email: user.email,
				code: passwordCode,
				password: newPassword,
			};
			await userApi.updatePassword(data);
			toast.success("密码修改成功，请重新登录");
			setTimeout(async () => {
				await logout();
				navigate("/login");
			}, 2000);
		} catch (error: unknown) {
			handleApiError(error, "修改失败");
		} finally {
			setPasswordLoading(false);
		}
	};

	// 渲染用户名修改框
	const renderUsernameEdit = () => (
		<form onSubmit={updateUsername} className="space-y-4 mt-4">
			<div className="space-y-2">
				<Label htmlFor="username" className="text-stone-600">
					新用户名
				</Label>
				<div className="relative">
					<User className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
					<Input
						id="username"
						value={username}
						onChange={handleUsernameChange}
						minLength={1}
						maxLength={50}
						className={`pl-10 bg-[#f0ece6] shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)] rounded-xl ${
							usernameError
								? "border-red-400 focus-visible:ring-red-400"
								: "border-stone-300/60"
						}`}
					/>
				</div>
				{usernameError && (
					<p className="text-sm text-red-500">{usernameError}</p>
				)}
			</div>
			<div className="flex gap-2">
				<Button
					type="submit"
					disabled={usernameLoading}
					className="bg-stone-600 hover:bg-stone-700 rounded-xl"
				>
					{usernameLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					保存
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={closeAllEdits}
					className="bg-[#f0ece6] border-stone-300/60 rounded-xl"
				>
					取消
				</Button>
			</div>
		</form>
	);

	// 渲染邮箱修改框
	const renderEmailEdit = () => (
		<form onSubmit={updateEmail} className="space-y-4 mt-4">
			<div className="space-y-2">
				<Label htmlFor="newEmail" className="text-stone-600">
					新邮箱
				</Label>
				<div className="relative">
					<Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
					<Input
						id="newEmail"
						type="email"
						value={newEmail}
						onChange={handleNewEmailChange}
						className={`pl-10 bg-[#f0ece6] shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)] rounded-xl ${
							newEmailError
								? "border-red-400 focus-visible:ring-red-400"
								: "border-stone-300/60"
						}`}
					/>
				</div>
				{newEmailError && (
					<p className="text-sm text-red-500">{newEmailError}</p>
				)}
			</div>
			<div className="space-y-2">
				<Label htmlFor="emailCode" className="text-stone-600">
					验证码
				</Label>
				<div className="flex gap-2">
					<div className="relative flex-1">
						<KeyRound className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
						<Input
							id="emailCode"
							value={emailCode}
							onChange={handleEmailCodeChange}
							maxLength={6}
							className={`pl-10 bg-[#f0ece6] shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)] rounded-xl ${
								emailCodeError
									? "border-red-400 focus-visible:ring-red-400"
									: "border-stone-300/60"
							}`}
						/>
					</div>
					<Button
						type="button"
						variant="outline"
						onClick={sendEmailCode}
						disabled={sendingEmailCode || emailCountdown > 0}
						className="bg-[#f0ece6] border-stone-300/60 rounded-xl"
					>
						{emailCountdown > 0 ? (
							`${emailCountdown}s`
						) : sendingEmailCode ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							"获取验证码"
						)}
					</Button>
				</div>
				{emailCodeError && (
					<p className="text-sm text-red-500">{emailCodeError}</p>
				)}
			</div>
			<div className="flex gap-2">
				<Button
					type="submit"
					disabled={emailLoading}
					className="bg-stone-600 hover:bg-stone-700 rounded-xl"
				>
					{emailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					修改邮箱
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={closeAllEdits}
					className="bg-[#f0ece6] border-stone-300/60 rounded-xl"
				>
					取消
				</Button>
			</div>
		</form>
	);

	// 渲染密码修改框
	const renderPasswordEdit = () => (
		<form onSubmit={updatePassword} className="space-y-4 mt-4">
			<div className="space-y-2">
				<Label htmlFor="passwordCode" className="text-stone-600">
					验证码
				</Label>
				<div className="flex gap-2">
					<div className="relative flex-1">
						<KeyRound className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
						<Input
							id="passwordCode"
							value={passwordCode}
							onChange={handlePasswordCodeChange}
							maxLength={6}
							className={`pl-10 bg-[#f0ece6] shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)] rounded-xl ${
								passwordCodeError
									? "border-red-400 focus-visible:ring-red-400"
									: "border-stone-300/60"
							}`}
						/>
					</div>
					<Button
						type="button"
						variant="outline"
						onClick={sendPasswordCode}
						disabled={sendingPasswordCode || passwordCountdown > 0}
						className="bg-[#f0ece6] border-stone-300/60 rounded-xl"
					>
						{passwordCountdown > 0 ? (
							`${passwordCountdown}s`
						) : sendingPasswordCode ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							"获取验证码"
						)}
					</Button>
				</div>
				{passwordCodeError && (
					<p className="text-sm text-red-500">{passwordCodeError}</p>
				)}
			</div>
			<div className="space-y-2">
				<Label htmlFor="newPassword" className="text-stone-600">
					新密码
				</Label>
				<div className="relative">
					<Lock className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
					<Input
						id="newPassword"
						type="password"
						value={newPassword}
						onChange={handleNewPasswordChange}
						minLength={6}
						maxLength={128}
						className={`pl-10 bg-[#f0ece6] shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)] rounded-xl ${
							newPasswordError
								? "border-red-400 focus-visible:ring-red-400"
								: "border-stone-300/60"
						}`}
					/>
				</div>
				{newPasswordError && (
					<p className="text-sm text-red-500">{newPasswordError}</p>
				)}
			</div>
			<div className="space-y-2">
				<Label htmlFor="confirmPassword" className="text-stone-600">
					确认密码
				</Label>
				<div className="relative">
					<Lock className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
					<Input
						id="confirmPassword"
						type="password"
						value={confirmPassword}
						onChange={handleConfirmPasswordChange}
						className={`pl-10 bg-[#f0ece6] shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)] rounded-xl ${
							confirmPasswordError
								? "border-red-400 focus-visible:ring-red-400"
								: "border-stone-300/60"
						}`}
					/>
				</div>
				{confirmPasswordError && (
					<p className="text-sm text-red-500">{confirmPasswordError}</p>
				)}
			</div>
			<div className="flex gap-2">
				<Button
					type="submit"
					disabled={passwordLoading}
					className="bg-stone-600 hover:bg-stone-700 rounded-xl"
				>
					{passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					修改密码
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={closeAllEdits}
					className="bg-[#f0ece6] border-stone-300/60 rounded-xl"
				>
					取消
				</Button>
			</div>
		</form>
	);

	// 渲染信息行（带修改按钮）
	const renderInfoRow = (
		field: EditField,
		label: string,
		value: React.ReactNode,
		editContent: React.ReactNode,
	) => {
		const isEditing = editingField === field;
		return (
			<div className="py-3">
				{isEditing ? (
					editContent
				) : (
					<div className="flex items-center justify-between w-full">
						<div className="flex items-center gap-4">
							<span className="text-stone-500 w-16">{label}</span>
							<span className="text-stone-700">{value}</span>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => openEdit(field)}
							className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
						>
							<Pencil className="h-4 w-4 mr-1" />
							修改
						</Button>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="min-h-screen flex bg-[#e8e4df]">
			<aside className="w-64 border-r border-stone-300/60 bg-[#f0ece6] flex flex-col">
				<div className="p-4 text-center font-semibold text-lg text-stone-700">
					用户中心
				</div>
				<nav className="flex-1 space-y-1 p-2">
					<button
						type="button"
						className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm bg-stone-600 text-white"
					>
						<User className="h-4 w-4" />
						个人信息
					</button>
					{hasScope("*") ? (
						<button
							type="button"
							onClick={() => navigate("/admin")}
							className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-stone-600 hover:bg-stone-200/50"
						>
							<PanelsTopLeft className="h-4 w-4" />
							管理后台
						</button>
					) : null}
				</nav>
				<div className="p-2">
					<Button
						onClick={handleLogout}
						className="w-full bg-red-500 text-white hover:bg-red-600 rounded-xl"
					>
						<LogOut className="mr-2 h-4 w-4" />
						登出
					</Button>
				</div>
			</aside>
			<main className="flex-1 p-6">
				<Card className="rounded-2xl border-0 bg-[#e8e4df] shadow-none w-full h-full">
					<CardHeader>
						<CardTitle className="text-stone-700">个人信息</CardTitle>
					</CardHeader>
					<CardContent>
						{renderInfoRow(
							"username",
							"用户名",
							user?.username,
							renderUsernameEdit(),
						)}
						<Separator className="bg-stone-300/60" />
						{renderInfoRow("email", "邮箱", user?.email, renderEmailEdit())}
						<Separator className="bg-stone-300/60" />
						{renderInfoRow(
							"password",
							"密码",
							"••••••••",
							renderPasswordEdit(),
						)}
						<Separator className="bg-stone-300/60" />
						<div className="py-3">
							<div className="flex items-center gap-4">
								<span className="text-stone-500 w-16">用户组</span>
								<div className="flex flex-wrap gap-2">
									{user?.groups.map((group) => (
										<Badge
											key={group}
											variant="secondary"
											className="bg-[#f0ece6] text-stone-600"
										>
											{group}
										</Badge>
									))}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</main>
		</div>
	);
}
