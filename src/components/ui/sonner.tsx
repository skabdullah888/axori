import { Toaster as Sonner } from "sonner";
import { CheckCircle2, AlertTriangle, Info, XCircle, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      richColors
      closeButton
      expand
      visibleToasts={4}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-success" />,
        error: <XCircle className="h-5 w-5 text-destructive" />,
        warning: <AlertTriangle className="h-5 w-5 text-warning" />,
        info: <Info className="h-5 w-5 text-primary" />,
        loading: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
      }}
      toastOptions={{
        duration: 3500,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/95 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border/60 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:px-4 group-[.toaster]:py-3 toast-pretty",
          title: "font-semibold text-sm",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:font-semibold",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:border-border group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground",
          success: "group-[.toaster]:!border-success/40",
          error: "group-[.toaster]:!border-destructive/40",
          warning: "group-[.toaster]:!border-warning/40",
          info: "group-[.toaster]:!border-primary/40",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
