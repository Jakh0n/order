"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import {
  type Control,
  Controller,
  type FieldErrors,
  type FieldPath,
  useFieldArray,
  useForm,
  type UseFormRegister,
} from "react-hook-form";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { deleteProduct, saveProduct } from "@/lib/menu/admin-actions";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/currency-provider";
import { priceStep } from "@/lib/money";
import {
  type ProductFormData,
  type ProductFormInput,
  productFormSchema,
  productFormToMinor,
} from "@/lib/validators";

import { ImageUpload } from "./image-upload";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30";

type ErrorText = (message?: string) => string | null;

export function ProductForm({
  productId,
  defaultValues,
  categories,
}: {
  productId: string | null;
  defaultValues: ProductFormInput;
  categories: { id: string; name: string }[];
}) {
  const t = useTranslations("adminMenu");
  const currency = useCurrency();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, unknown, ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });
  const groups = useFieldArray({ control, name: "optionGroups" });

  const errorText: ErrorText = (message) => {
    if (!message) return null;
    return t.has(`errors.${message}`) ? t(`errors.${message}`) : t("errors.invalid");
  };

  async function onSubmit(values: ProductFormData) {
    // The form works in major units (8.99); the server stores minor units (899)
    const result = await saveProduct(productId, productFormToMinor(values, currency));
    if (!result.ok) {
      for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(path as FieldPath<ProductFormInput>, { message });
      }
      toast.error(t(`errors.${result.error}`));
      return;
    }
    toast.success(t("saved"));
    router.push("/admin/menu");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col">
      <Section>
        <Field label={t("image")}>
          <Controller
            control={control}
            name="imageUrl"
            render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} />}
          />
        </Field>

        <Field label={t("name")} htmlFor="name" error={errorText(errors.name?.message)}>
          <Input
            id="name"
            placeholder={t("namePlaceholder")}
            maxLength={100}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
        </Field>

        <Field
          label={t("description")}
          htmlFor="description"
          error={errorText(errors.description?.message)}
        >
          <Textarea
            id="description"
            rows={2}
            maxLength={500}
            placeholder={t("descriptionPlaceholder")}
            {...register("description")}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label={t("price", { currency })}
            htmlFor="price"
            error={errorText(errors.price?.message)}
          >
            <Input
              id="price"
              type="number"
              inputMode="numeric"
              min={0}
              step={priceStep(currency)}
              aria-invalid={!!errors.price}
              {...register("price", { valueAsNumber: true })}
            />
          </Field>
          <Field
            label={t("category")}
            htmlFor="categoryId"
            error={errorText(errors.categoryId?.message)}
          >
            <select
              id="categoryId"
              className={selectClass}
              aria-invalid={!!errors.categoryId}
              {...register("categoryId")}
            >
              <option value="" disabled>
                {t("chooseCategory")}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Controller
          control={control}
          name="isAvailable"
          render={({ field }) => (
            <label className="flex cursor-pointer items-start gap-3">
              <Switch checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
              <span className="flex flex-col">
                <span className="font-medium">
                  {field.value ? t("available") : t("unavailable")}
                </span>
                <span className="text-muted-foreground text-xs">{t("availableHint")}</span>
              </span>
            </label>
          )}
        />
      </Section>

      <Section>
        <div>
          <h2 className="font-semibold">{t("optionGroups")}</h2>
          <p className="text-muted-foreground text-xs">{t("optionGroupsHint")}</p>
        </div>

        {groups.fields.map((group, index) => (
          <GroupEditor
            key={group.id}
            index={index}
            control={control}
            register={register}
            errors={errors}
            errorText={errorText}
            onRemove={() => groups.remove(index)}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={groups.fields.length >= 10}
          onClick={() =>
            groups.append({
              name: "",
              required: true,
              maxSelect: 1,
              options: [
                { name: "", price: 0 },
                { name: "", price: 0 },
              ],
            })
          }
        >
          <Plus />
          {t("addGroup")}
        </Button>
      </Section>

      <div className="bg-background/95 sticky bottom-0 z-10 flex items-center gap-2 border-t p-3 backdrop-blur md:px-0">
        <Button type="submit" size="lg" className="h-11 flex-1" disabled={isSubmitting || deleting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {t("save")}
        </Button>
        {productId && (
          <Button
            type="button"
            size="lg"
            variant="ghost"
            className="text-destructive h-11"
            disabled={isSubmitting || deleting}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 />
            {t("delete")}
          </Button>
        )}
      </div>

      {productId && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={t("deleteProductTitle", { name: defaultValues.name })}
          description={t("deleteProductHint")}
          confirmLabel={t("delete")}
          cancelLabel={t("cancel")}
          pending={deleting}
          onConfirm={() =>
            startDelete(async () => {
              const result = await deleteProduct(productId);
              if (!result.ok) {
                toast.error(t(`errors.${result.error}`));
                return;
              }
              toast.success(t("deleted"));
              router.push("/admin/menu");
              router.refresh();
            })
          }
        />
      )}
    </form>
  );
}

function GroupEditor({
  index,
  control,
  register,
  errors,
  errorText,
  onRemove,
}: {
  index: number;
  control: Control<ProductFormInput, unknown, ProductFormData>;
  register: UseFormRegister<ProductFormInput>;
  errors: FieldErrors<ProductFormInput>;
  errorText: ErrorText;
  onRemove: () => void;
}) {
  const t = useTranslations("adminMenu");
  const currency = useCurrency();
  const options = useFieldArray({ control, name: `optionGroups.${index}.options` });
  const groupErrors = errors.optionGroups?.[index];

  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            placeholder={t("groupPlaceholder")}
            aria-label={t("groupName")}
            maxLength={60}
            aria-invalid={!!groupErrors?.name}
            {...register(`optionGroups.${index}.name`)}
          />
          <ErrorLine text={errorText(groupErrors?.name?.message)} />
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-destructive"
          aria-label={t("removeGroup")}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Controller
          control={control}
          name={`optionGroups.${index}.required`}
          render={({ field }) => (
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              {t("required")}
            </label>
          )}
        />
        <label className="flex items-center gap-2">
          {t("maxSelect")}
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            className="w-16"
            aria-invalid={!!groupErrors?.maxSelect}
            {...register(`optionGroups.${index}.maxSelect`, { valueAsNumber: true })}
          />
        </label>
      </div>
      <ErrorLine text={errorText(groupErrors?.maxSelect?.message)} />

      <ul className="flex flex-col gap-2">
        {options.fields.map((option, oIndex) => {
          const optionErrors = groupErrors?.options?.[oIndex];
          return (
            <li key={option.id} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  placeholder={t("optionName")}
                  aria-label={t("optionName")}
                  maxLength={60}
                  aria-invalid={!!optionErrors?.name}
                  {...register(`optionGroups.${index}.options.${oIndex}.name`)}
                />
                <ErrorLine text={errorText(optionErrors?.name?.message)} />
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  inputMode="numeric"
                  step={priceStep(currency)}
                  placeholder="0"
                  aria-label={t("optionPrice")}
                  aria-invalid={!!optionErrors?.price}
                  {...register(`optionGroups.${index}.options.${oIndex}.price`, {
                    valueAsNumber: true,
                  })}
                />
                <ErrorLine text={errorText(optionErrors?.price?.message)} />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={t("removeOption")}
                disabled={options.fields.length <= 1}
                onClick={() => options.remove(oIndex)}
              >
                <X />
              </Button>
            </li>
          );
        })}
      </ul>
      <ErrorLine
        text={errorText(groupErrors?.options?.root?.message ?? groupErrors?.options?.message)}
      />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={options.fields.length >= 30}
        onClick={() => options.append({ name: "", price: 0 })}
      >
        <Plus />
        {t("addOption")}
      </Button>
    </fieldset>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="flex flex-col gap-4 border-b px-4 py-5 md:px-0">{children}</section>;
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <ErrorLine text={error} />
    </div>
  );
}

function ErrorLine({ text }: { text?: string | null }) {
  if (!text) return null;
  return <p className={cn("text-destructive text-sm")}>{text}</p>;
}
