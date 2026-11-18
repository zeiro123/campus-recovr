import { useForm } from "react-hook-form";
import { Spinner } from "flowbite-react";
import toastNotify from "../../components/modal/toastNotify";
import { useState } from "react";
import {
  useCategoryQuery,
  useCreateLostItemMutation,
} from "../../redux/api/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { IoIosArrowDown } from "react-icons/io";
import { FaBullhorn, FaTimes } from "react-icons/fa";
import type { ItemCategory } from "../../types/types";
import { useUserVerification } from "../../auth/auth";
import {
  IMAGE_ACCEPT,
  MAX_IMAGE_BYTES,
  formatBytes,
  uploadImageFile,
} from "../../utils/uploadImage";

type ReportLostForm = {
  lostItemName: string;
  description: string;
  location: string;
};

const ReportLostItem = () => {
  const {
    handleSubmit,
    register,
    formState: { errors },
    reset,
  } = useForm<ReportLostForm>();

  const user = useUserVerification();
  const [categoryId, setCategoryId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [createLostItem, { isLoading }] = useCreateLostItemMutation();
  const { data: Category } = useCategoryQuery("");
  const [startDate, setStartDate] = useState(new Date());
  const [phone, setPhone] = useState(user?.phone || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [uploading, setUploading] = useState(false);

  const pickImage = (file: File | null) => {
    setImageError("");
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(`Image is too large — max ${formatBytes(MAX_IMAGE_BYTES)}.`);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError("");
  };

  const onSubmit = async (data: ReportLostForm) => {
    setSubmitted(true);
    if (!categoryId || uploading) return;

    try {
      let imageUrl = "";
      if (imageFile) {
        setUploading(true);
        imageUrl = await uploadImageFile(imageFile);
      }

      const lostData = {
        lostItemName: data.lostItemName,
        description: data.description,
        categoryId,
        img: imageUrl,
        location: data.location,
        date: startDate,
        phone,
      };
      const res = await createLostItem(lostData);
      if (res?.data?.success == false) {
        toastNotify({ message: "Failed to create Lost item", status: false });
      } else {
        toastNotify({ message: "Lost item reported successfully", status: true });
        reset();
        setCategoryId("");
        setSubmitted(false);
        clearImage();
      }
    } catch (err: any) {
      toastNotify({
        message: err?.message || "Failed to create Lost item",
        status: false,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="page flex items-center justify-center px-4 py-12 sm:px-6">
      <div className="card w-full max-w-3xl p-6 md:p-8">
        <header className="mb-8 text-center">
          <span className="eyebrow">
            <FaBullhorn />
            Report a loss
          </span>
          <h1 className="mt-3 text-2xl font-bold text-ink md:text-3xl">
            Report Lost Item
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-dim md:text-base">
            Tell the community what you've lost so someone can help you find it.
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="lostItemName" className="field-label">
                Lost item name
              </label>
              <input
                id="lostItemName"
                {...register("lostItemName", {
                  required: "Lost item name is required",
                })}
                type="text"
                className="field"
                placeholder="Laptop/Phone"
              />
              {errors.lostItemName && (
                <p className="field-error">
                  {errors.lostItemName?.message as string}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="description" className="field-label">
                Description
              </label>
              <input
                id="description"
                type="text"
                className="field"
                placeholder="What does it look like, color, brand"
                {...register("description", {
                  required: "Description is required",
                })}
              />
              {errors.description && (
                <p className="field-error">
                  {errors.description?.message as string}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="itemImage" className="field-label">
                Photo (optional)
              </label>
              <input
                id="itemImage"
                type="file"
                accept={IMAGE_ACCEPT}
                className="field cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
              />
              {imagePreview && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Selected item preview"
                    className="h-16 w-16 rounded-lg border border-line object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="flex items-center gap-1 text-xs text-ink-mute transition hover:text-ink"
                  >
                    <FaTimes className="h-3 w-3" /> Remove
                  </button>
                </div>
              )}
              {imageError && <p className="field-error">{imageError}</p>}
              <p className="mt-1 text-[11px] text-ink-mute">
                PNG, JPEG, WebP or GIF — up to 5 MB.
              </p>
            </div>
            <div>
              <label htmlFor="contactPhone" className="field-label">
                Contact phone (optional)
              </label>
              <input
                id="contactPhone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="field"
                placeholder="e.g. 0772 123 4567"
                maxLength={20}
              />
              <p className="mt-1 text-[11px] text-ink-mute">
                If shared, people who find this item get a "Chat on WhatsApp"
                button. Leave blank to stay on-platform.
              </p>
            </div>
            <div>
              <label htmlFor="location" className="field-label">
                Location
              </label>
              <input
                id="location"
                type="text"
                className="field"
                placeholder="City, Country"
                {...register("location", {
                  required: "Location is required",
                })}
              />
              {errors.location && (
                <p className="field-error">
                  {errors.location?.message as string}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="lostDate" className="field-label">
                Date
              </label>
              <DatePicker
                wrapperClassName="w-full"
                className="field"
                selected={startDate}
                onChange={(date) => {
                  if (date) setStartDate(date);
                }}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select date"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                maxDate={new Date()}
              />
            </div>
            <div>
              <label htmlFor="category" className="field-label">
                Category
              </label>
              <div className="relative">
                <select
                  id="category"
                  className="field cursor-pointer appearance-none pr-10"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    if (submitted)
                      setSubmitted(
                        !Category?.data?.find(
                          (cat: ItemCategory) => cat.id === e.target.value
                        )
                      );
                  }}
                >
                  <option value="" disabled className="bg-surface-2 text-ink-mute">
                    Select a category
                  </option>
                  {Category?.data?.map((category: ItemCategory) => (
                    <option
                      key={category?.id}
                      value={category?.id}
                      className="bg-surface-2 text-ink"
                    >
                      {category?.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-ink-mute">
                  <IoIosArrowDown className="h-4 w-4" />
                </div>
              </div>
              {submitted && !categoryId && (
                <p className="field-error">Category is required</p>
              )}
            </div>
          </div>

          {isLoading || uploading ? (
            <div className="flex justify-center">
              <Spinner size="lg" className="text-accent" />
            </div>
          ) : (
            <button type="submit" className="btn btn-brand w-full sm:w-auto">
              Submit Lost Item
            </button>
          )}
        </form>
      </div>
    </section>
  );
};
export default ReportLostItem;
