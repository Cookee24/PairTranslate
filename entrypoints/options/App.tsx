import { BrainCircuit, Cog, Globe, Info, Languages } from "lucide-solid";
import { getThemeClass } from "~/utils/theme";
import Nav from "./components/Nav";
import About from "./pages/About";
import Advanced from "./pages/Advanced";
import Basic from "./pages/Basic";
import LLM from "./pages/LLM";
import Traditional from "./pages/Traditional";
import Translation from "./pages/Translation";

const Content = () => {
	const [top, setTop] = createSignal(8);
	const [render, setRender] = createSignal(false);
	const { settings, loading } = useSettings();

	createEffect(() => {
		// Only set when the first time loading is done
		if (!render() && !loading()) {
			setRender(true);
		}
	});

	createEffect(() => {
		const body = document.body;
		const theme = getThemeClass(settings.basic.theme);
		body.removeAttribute("data-theme");
		if (theme) {
			body.setAttribute("data-theme", theme);
		}
	});

	let ref: HTMLDivElement | undefined;
	onMount(() => {
		if (!ref) return;
		const handler = (height: number) => {
			setTop(height + 48);
		};

		handler(ref.offsetHeight);
		window.addEventListener("resize", () => handler(ref.offsetHeight));
		onCleanup(() =>
			window.removeEventListener("resize", () => handler(ref.offsetHeight)),
		);
	});

	return (
		<>
			<Nav.Root ref={ref}>
				<Nav.Item navId="basic">
					<Info size={16} />
					{t("nav.basic")}
				</Nav.Item>
				<Nav.Item navId="translate">
					<Languages size={16} />
					{t("nav.translation")}
				</Nav.Item>
				<Nav.Item navId="llm">
					<BrainCircuit size={16} />
					{t("nav.llmServices")}
				</Nav.Item>
				<Nav.Item navId="traditional">
					<Globe size={16} />
					{t("nav.traditionalServices")}
				</Nav.Item>
				<Nav.Item navId="advanced">
					<Cog size={16} />
					{t("nav.advanced")}
				</Nav.Item>
				<Nav.Item navId="about">
					<Info size={16} />
					{t("nav.about")}
				</Nav.Item>
			</Nav.Root>
			<div
				class="max-w-156 mx-auto px-4 flex flex-col gap-8 pb-16"
				style={{
					"margin-top": `${top()}px`,
				}}
			>
				<Show
					when={render()}
					fallback={<Loading class="self-center py-4" size="xl" />}
				>
					<Basic navId="basic" />
					<Translation navId="translate" />
					<LLM navId="llm" />
					<Traditional navId="traditional" />
					<Advanced navId="advanced" />
					<About navId="about" />
				</Show>
			</div>
		</>
	);
};

export default () => {
	return (
		<SettingsProvider>
			<Content />
		</SettingsProvider>
	);
};
