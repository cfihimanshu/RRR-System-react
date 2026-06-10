import Swal from 'sweetalert2';

export const confirmDelete = async (title = 'Are you sure?', text = "You won't be able to revert this!") => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#4b5563',
    confirmButtonText: 'Yes, delete it!',
    background: '#121212',
    color: '#ffffff',
    customClass: {
      popup: 'border-2 border-red-500/20 rounded-[2rem]',
      title: 'font-black uppercase tracking-wider',
      confirmButton: 'font-black uppercase tracking-widest rounded-xl',
      cancelButton: 'font-black uppercase tracking-widest rounded-xl'
    }
  });

  return result.isConfirmed;
};
