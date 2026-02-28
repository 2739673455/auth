import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RelationItem {
	id: number;
	name: string;
	description?: string | null;
}

interface RelationEditorProps {
	title: string;
	allItems: RelationItem[];
	selectedIds: number[];
	onChange: (selected: number[]) => void;
}

export function RelationEditor({
	title,
	allItems,
	selectedIds,
	onChange,
}: RelationEditorProps) {
	const [leftSearch, setLeftSearch] = useState("");
	const [rightSearch, setRightSearch] = useState("");
	const [leftSelected, setLeftSelected] = useState<number[]>([]);
	const [rightSelected, setRightSelected] = useState<number[]>([]);

	// 已关联和未关联的项目
	const associated = allItems.filter((item) => selectedIds.includes(item.id));
	const unassociated = allItems.filter(
		(item) => !selectedIds.includes(item.id),
	);

	// 搜索过滤
	const filteredAssociated = associated.filter(
		(item) =>
			item.name.toLowerCase().includes(leftSearch.toLowerCase()) ||
			item.description?.toLowerCase().includes(leftSearch.toLowerCase()),
	);
	const filteredUnassociated = unassociated.filter(
		(item) =>
			item.name.toLowerCase().includes(rightSearch.toLowerCase()) ||
			item.description?.toLowerCase().includes(rightSearch.toLowerCase()),
	);

	// 全选
	const selectAllLeft = () => {
		setLeftSelected(filteredAssociated.map((i) => i.id));
	};
	const selectAllRight = () => {
		setRightSelected(filteredUnassociated.map((i) => i.id));
	};

	// 清除选择
	const clearLeft = () => {
		setLeftSelected([]);
	};
	const clearRight = () => {
		setRightSelected([]);
	};

	// 移动到右侧（取消关联）
	const moveToRight = () => {
		onChange(selectedIds.filter((id) => !leftSelected.includes(id)));
		setLeftSelected([]);
	};

	// 移动到左侧（添加关联）
	const moveToLeft = () => {
		onChange([...selectedIds, ...rightSelected]);
		setRightSelected([]);
	};

	// 切换选择
	const toggleLeft = (id: number) => {
		setLeftSelected((prev) =>
			prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
		);
	};
	const toggleRight = (id: number) => {
		setRightSelected((prev) =>
			prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
		);
	};

	const renderList = (
		items: RelationItem[],
		selected: number[],
		toggle: (id: number) => void,
		search: string,
		setSearch: (s: string) => void,
		selectAll: () => void,
		clearSelection: () => void,
		emptyText: string,
	) => (
		<div className="flex flex-col h-full">
			<div className="flex items-center gap-2 mb-2">
				<div className="relative flex-1">
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full bg-white border-stone-300/60 rounded-xl text-sm h-8 pr-8"
					/>
					{search && (
						<button
							type="button"
							onClick={() => setSearch("")}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
						>
							<X className="h-4 w-4" />
						</button>
					)}
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={selectAll}
					className="bg-white border-stone-300/60 rounded-xl h-8 px-2"
				>
					全选
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={clearSelection}
					className="bg-white border-stone-300/60 rounded-xl h-8 px-2"
				>
					取消
				</Button>
			</div>
			<div className="flex-1 overflow-y-auto border border-stone-300/60 rounded-xl bg-white p-2">
				{items.length === 0 ? (
					<p className="text-sm text-stone-400 text-center py-4">{emptyText}</p>
				) : (
					<div className="space-y-1">
						{items.map((item) => (
							<button
								type="button"
								key={item.id}
								onClick={() => toggle(item.id)}
								className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
									selected.includes(item.id)
										? "bg-stone-600 text-white"
										: "hover:bg-stone-100"
								}`}
							>
								<div className="font-medium">{item.name}</div>
								{item.description && (
									<div className="text-xs opacity-70 truncate">
										{item.description}
									</div>
								)}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);

	return (
		<div className="flex gap-4 h-[600px]">
			<div className="flex-1">
				<div className="text-sm font-medium text-stone-600 mb-2">
					已关联{title}
				</div>
				{renderList(
					filteredAssociated,
					leftSelected,
					toggleLeft,
					leftSearch,
					setLeftSearch,
					selectAllLeft,
					clearLeft,
					"暂无已关联",
				)}
			</div>
			<div className="flex flex-col justify-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={moveToLeft}
					disabled={rightSelected.length === 0}
					className="bg-white border-stone-300/60 rounded-xl"
				>
					&lt;
				</Button>
				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={moveToRight}
					disabled={leftSelected.length === 0}
					className="bg-white border-stone-300/60 rounded-xl"
				>
					&gt;
				</Button>
			</div>
			<div className="flex-1">
				<div className="text-sm font-medium text-stone-600 mb-2">
					未关联{title}
				</div>
				{renderList(
					filteredUnassociated,
					rightSelected,
					toggleRight,
					rightSearch,
					setRightSearch,
					selectAllRight,
					clearRight,
					"暂无未关联",
				)}
			</div>
		</div>
	);
}
