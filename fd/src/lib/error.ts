import { toast } from "sonner";

// API 错误处理
export const handleApiError = (error: any, defaultMessage: string): void => {
	const data = error?.response?.data;
	let msg = defaultMessage;

	if (data?.message && data?.detail) {
		msg = `${data.message}: ${data.detail}`;
	} else if (data?.message) {
		msg = data.message;
	}

	toast.error(msg);
};
