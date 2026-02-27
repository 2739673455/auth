import { Loader2, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { handleApiError } from "@/lib/error";
import { validateEmailWithError } from "@/lib/validation";
import { userApi } from "../../api/user";
import { useAuthStore } from "../../stores/authStore";
import type { LoginRequest } from "../../types";

export default function Login() {
	const navigate = useNavigate();
	const login = useAuthStore((state) => state.login);
	const [loading, setLoading] = useState(false);
	const [emailError, setEmailError] = useState("");
	const [formData, setFormData] = useState<LoginRequest>({
		email: "",
		password: "",
	});

	// 处理邮箱输入变化
	const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const email = e.target.value;
		setFormData({ ...formData, email });
		const result = validateEmailWithError(email);
		setEmailError(email ? result.error : "");
	};

	const handleSubmit: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
		e.preventDefault();
		setLoading(true);
		try {
			await userApi.login(formData);
			const verifyResponse = await userApi.verifyAccessToken();
			const { scope } = verifyResponse.data;
			const userResponse = await userApi.getMe();
			login(userResponse.data, scope);
			toast.success("登录成功");
			navigate("/profile");
		} catch (error: any) {
			handleApiError(error, "登录失败");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-[#e8e4df] p-8">
			<div className="w-full max-w-md rounded-3xl bg-[#e8e4df] p-8 shadow-[inset_6px_6px_12px_#c9c5be,inset_-6px_-6px_12px_#ffffff]">
				<Card className="rounded-2xl border-0 bg-[#e8e4df] shadow-none">
					<CardHeader className="text-center pb-2">
						<CardTitle className="text-2xl text-stone-700">用户登录</CardTitle>
					</CardHeader>
					<CardContent className="pt-4">
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="email" className="text-stone-600">
									邮箱
								</Label>
								<div className="relative">
									<Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
									<Input
										id="email"
										type="email"
										placeholder="请输入邮箱"
										className={`pl-10 bg-[#f0ece6] shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)] rounded-xl ${
											emailError
												? "border-red-400 focus-visible:ring-red-400"
												: "border-stone-300/60"
										}`}
										value={formData.email}
										onChange={handleEmailChange}
										required
									/>
								</div>
								{emailError && (
									<p className="text-sm text-red-500">{emailError}</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="password" className="text-stone-600">
									密码
								</Label>
								<div className="relative">
									<Lock className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
									<Input
										id="password"
										type="password"
										placeholder="请输入密码"
										className="pl-10 bg-[#f0ece6] border-stone-300/60 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)] rounded-xl"
										value={formData.password}
										onChange={(e) =>
											setFormData({ ...formData, password: e.target.value })
										}
										required
									/>
								</div>
							</div>

							<Button
								type="submit"
								className="w-full bg-stone-600 hover:bg-stone-700 mt-2 rounded-xl"
								disabled={loading}
							>
								{loading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										登录中...
									</>
								) : (
									"登录"
								)}
							</Button>
						</form>

						<div className="mt-6 flex justify-between text-sm">
							<span className="text-stone-500">
								还没有账号？{" "}
								<Link
									to="/register"
									className="text-blue-600 underline hover:text-blue-700"
								>
									立即注册
								</Link>
							</span>
							<Link
								to="/forget_password"
								className="text-blue-600 underline hover:text-blue-700"
							>
								忘记密码？
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
