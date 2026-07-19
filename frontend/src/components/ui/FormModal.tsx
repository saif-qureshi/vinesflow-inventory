"use client";

import { Form, Modal, type FormInstance } from "antd";

interface FormModalProps<T> {
  title: string;
  open: boolean;
  form: FormInstance<T>;
  onCancel: () => void;
  onSubmit: (values: T) => void | Promise<void>;
  children: React.ReactNode;
  okText?: string;
  width?: number;
  confirmLoading?: boolean;
}

export function FormModal<T extends object>({
  title,
  open,
  form,
  onCancel,
  onSubmit,
  children,
  okText = "Save",
  width,
  confirmLoading,
}: FormModalProps<T>) {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText={okText}
      width={width}
      confirmLoading={confirmLoading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onSubmit} className="!mt-4">
        {children}
      </Form>
    </Modal>
  );
}
